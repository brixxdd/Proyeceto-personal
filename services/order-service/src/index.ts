import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { readFileSync } from 'fs';
import { join } from 'path';
import cors from 'cors';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { Kafka } from 'kafkajs';
import { logger } from './utils/logger';
import { OrderResolver } from './resolvers/order.resolver';
import { OrderService } from './services/order.service';
import { OrderRepository } from './repositories/order.repository';
import { KafkaProducer } from './events/kafka.producer';
import { Database } from './database/database';
import { RedisPubSub } from './pubsub/redis.pubsub';
import { extractAuthContext } from './middleware/auth';
import { IdempotencyService } from './services/idempotency.service';
import { register as metricsRegister, connectionStatus } from './metrics/prometheus';

const app = express();
const PORT = process.env.PORT || 3000;

// HTTP server wrapping Express (required for WebSocket co-location)
const httpServer = createServer(app);

// Database
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis — two clients: one for cache/commands, two dedicated to PubSub
// The subscriber client must stay in subscribe mode; it cannot issue regular commands.
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const redisPubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const redisSubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

// Kafka
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});
const kafkaProducer = kafka.producer();

// PubSub — backed by Redis, used by GraphQL subscriptions
const pubSub = new RedisPubSub(redisPubClient, redisSubClient);

// Idempotency — backed by Redis, used by Kafka producer
const idempotencyService = new IdempotencyService(redisClient);

// Dependency graph
const orderRepository = new OrderRepository(dbPool);
const kafkaProducerService = new KafkaProducer(kafkaProducer, idempotencyService);
const orderService = new OrderService(orderRepository, redisClient, kafkaProducerService, pubSub);
const orderResolver = new OrderResolver(orderService);

// GraphQL schema + resolvers
const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

const resolvers = {
  Query: {
    orders: orderResolver.getOrders.bind(orderResolver),
    order: orderResolver.getOrderById.bind(orderResolver),
  },
  Mutation: {
    createOrder: orderResolver.createOrder.bind(orderResolver),
    updateOrderStatus: orderResolver.updateOrderStatus.bind(orderResolver),
    cancelOrder: orderResolver.cancelOrder.bind(orderResolver),
  },
  Subscription: {
    orderStatusChanged: {
      // subscribe returns an AsyncIterable; graphql-ws iterates it and sends each value
      subscribe: orderResolver.subscribeToOrderStatus.bind(orderResolver),
      // resolve maps the raw published Order to the field value
      resolve: (payload: unknown) => payload,
    },
  },
};

// Shared schema object — consumed by both Apollo Server (HTTP) and graphql-ws (WS)
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    await dbPool.query('SELECT 1');
    await redisClient.ping();
    res.status(200).json({
      status: 'healthy',
      service: 'order-service',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'order-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    // Actualizar estado de conexiones
    try {
      await dbPool.query('SELECT 1');
      connectionStatus.set({ service: 'postgres' }, 1);
    } catch {
      connectionStatus.set({ service: 'postgres' }, 0);
    }

    try {
      await redisClient.ping();
      connectionStatus.set({ service: 'redis' }, 1);
    } catch {
      connectionStatus.set({ service: 'redis' }, 0);
    }

    connectionStatus.set({ service: 'kafka' }, kafkaProducer.isRunning() ? 1 : 0);

    const metrics = await metricsRegister.metrics();
    res.set('Content-Type', metricsRegister.contentType);
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', error);
    res.status(500).send('Failed to generate metrics');
  }
});

async function startServer() {
  try {
    // Connect all Redis clients
    await Promise.all([
      redisClient.connect(),
      redisPubClient.connect(),
      redisSubClient.connect(),
    ]);
    logger.info('Connected to Redis (cache + pubsub)');

    await kafkaProducer.connect();
    logger.info('Connected to Kafka');

    await Database.runMigrations(dbPool);
    logger.info('Database migrations completed');

    // ── WebSocket server for GraphQL Subscriptions ──────────────────────────
    // Mounted on the same path as the HTTP GraphQL endpoint so a single port
    // handles both protocols (the Upgrade header distinguishes them).
    const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

    const wsServerCleanup = useServer(
      {
        schema,
        context: (ctx) => {
          // WebSocket clients pass the JWT via connectionParams.authorization
          const raw = ctx.connectionParams?.authorization as string | undefined;
          const authHeader = raw?.startsWith('Bearer ') ? raw : raw ? `Bearer ${raw}` : undefined;
          const auth = extractAuthContext(authHeader);
          return { auth, pubSub };
        },
      },
      wsServer,
    );

    logger.info('WebSocket server ready for GraphQL Subscriptions');

    // ── Apollo Server (HTTP) ────────────────────────────────────────────────
    const server = new ApolloServer({
      schema,
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [
        // Gracefully drain HTTP keep-alive connections on shutdown
        ApolloServerPluginDrainHttpServer({ httpServer }),
        // Gracefully close WebSocket connections on shutdown
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await wsServerCleanup.dispose();
              },
            };
          },
        },
      ],
    });

    await server.start();

    app.use(
      '/graphql',
      cors(),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          const auth = extractAuthContext(req.headers.authorization);
          return { auth, user: auth.user ?? null, pubSub };
        },
      }),
    );

    // Use httpServer.listen so WebSocket upgrade events are captured
    await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));

    logger.info(`Order Service running on port ${PORT}`);
    logger.info(`GraphQL (HTTP):      http://localhost:${PORT}/graphql`);
    logger.info(`GraphQL (WebSocket): ws://localhost:${PORT}/graphql`);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await Promise.allSettled([
    dbPool.end(),
    redisClient.quit(),
    redisPubClient.quit(),
    redisSubClient.quit(),
    kafkaProducer.disconnect(),
  ]);
  process.exit(0);
});

startServer();
