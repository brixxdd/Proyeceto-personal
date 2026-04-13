import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { readFileSync } from 'fs';
import { join } from 'path';
import cors from 'cors';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { Kafka } from 'kafkajs';
import { logger } from './utils/logger';
import { DeliveryResolver } from './resolvers/delivery.resolver';
import { DeliveryService } from './services/delivery.service';
import { DeliveryRepository } from './repositories/delivery.repository';
import { KafkaProducer } from './events/kafka.producer';
import { KafkaConsumer } from './events/kafka.consumer';
import { Database } from './database/database';
import { RedisPubSub } from './pubsub/redis.pubsub';
import { IdempotencyService } from './services/idempotency.service';
import { extractAuthContext } from './middleware/auth';
import {
  register as metricsRegister,
  connectionStatus,
  activeDeliveries,
  availableDrivers,
} from './metrics/prometheus';

const app = express();
const PORT = process.env.PORT || 3003;

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
  clientId: process.env.KAFKA_CLIENT_ID || 'delivery-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});
const kafkaRawProducer = kafka.producer();
const kafkaRawConsumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'delivery-service-group',
});

// PubSub — backed by Redis, used by GraphQL subscriptions
const pubSub = new RedisPubSub(redisPubClient, redisSubClient);

// Idempotency — backed by Redis, used by Kafka producer
const idempotencyService = new IdempotencyService(redisClient);

// Dependency graph
const deliveryRepository = new DeliveryRepository(dbPool);
const kafkaProducerService = new KafkaProducer(kafkaRawProducer, idempotencyService);
const deliveryService = new DeliveryService(
  deliveryRepository,
  kafkaProducerService,
  pubSub,
);
const kafkaConsumer = new KafkaConsumer(kafkaRawConsumer, deliveryService);
const deliveryResolver = new DeliveryResolver(deliveryService);

// GraphQL schema + resolvers
const typeDefsString = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

const resolvers = {
  Query: {
    delivery: deliveryResolver.getDelivery.bind(deliveryResolver),
    deliveries: deliveryResolver.getDeliveries.bind(deliveryResolver),
    availableDrivers: deliveryResolver.getAvailableDrivers.bind(deliveryResolver),
    deliveryPerson: deliveryResolver.getDeliveryPerson.bind(deliveryResolver),
  },
  Mutation: {
    updateDriverStatus: deliveryResolver.updateDriverStatus.bind(deliveryResolver),
    updateDeliveryStatus: deliveryResolver.updateDeliveryStatus.bind(deliveryResolver),
  },
  Subscription: {
    deliveryStatusChanged: {
      subscribe: deliveryResolver.subscribeToDeliveryStatus.bind(deliveryResolver),
      resolve: (payload: unknown) => payload,
    },
    driverAssigned: {
      subscribe: deliveryResolver.subscribeToDriverAssigned.bind(deliveryResolver),
      resolve: (payload: unknown) => payload,
    },
  },
};

// buildSubgraphSchema exposes _service { sdl } required by Apollo Federation IntrospectAndCompose
const schema = buildSubgraphSchema([{ typeDefs: parse(typeDefsString), resolvers }]);

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    await dbPool.query('SELECT 1');
    await redisClient.ping();
    res.status(200).json({
      status: 'healthy',
      service: 'delivery-service',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'delivery-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    // Update connection status gauges
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

    connectionStatus.set({ service: 'kafka' }, kafkaProducerService.isConnected() ? 1 : 0);

    // Refresh business gauges
    try {
      const active = await deliveryRepository.countActiveDeliveries();
      activeDeliveries.set(active);
      const avail = await deliveryRepository.countAvailableDrivers();
      availableDrivers.set(avail);
    } catch {
      // Non-fatal — metrics may be stale
    }

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

    await kafkaRawProducer.connect();
    logger.info('Connected to Kafka producer');

    await Database.runMigrations(dbPool);
    logger.info('Database migrations completed');

    // Start Kafka consumer (connects and subscribes internally)
    await kafkaRawConsumer.connect();
    await kafkaConsumer.start();
    logger.info('Kafka consumer started');

    // ── WebSocket server for GraphQL Subscriptions ──────────────────────────
    const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

    const wsServerCleanup = useServer(
      {
        schema,
        context: (ctx) => {
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
        ApolloServerPluginDrainHttpServer({ httpServer }),
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

    logger.info(`Delivery Service running on port ${PORT}`);
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
    kafkaRawProducer.disconnect(),
    kafkaConsumer.disconnect(),
  ]);
  process.exit(0);
});

startServer();
