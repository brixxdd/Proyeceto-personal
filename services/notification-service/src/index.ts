import './tracing';
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
import { logger } from './utils/logger';
import { NotificationService } from './services/notification.service';
import { NotificationKafkaConsumer } from './events/kafka.consumer';
import { resolvers } from './resolvers';
import { register as metricsRegister, connectionStatus } from './metrics/prometheus';

const app = express();
const PORT = process.env.PORT || 3004;

// HTTP server wrapping Express (required for WebSocket co-location)
const httpServer = createServer(app);

// Database
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis — three clients:
//   pubClient  → publish to channels (notification-service writes)
//   subClient  → subscribe to channels (GraphQL subscriptions read)
//   cacheClient → general commands (health check, ping)
const cacheClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

// Services
const notificationService = new NotificationService(dbPool, pubClient);
const kafkaConsumer = new NotificationKafkaConsumer(notificationService);

// GraphQL schema
const typeDefsString = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
const schema = buildSubgraphSchema([{ typeDefs: parse(typeDefsString), resolvers }]);

// Health check endpoint
app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await dbPool.query('SELECT 1');
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  try {
    await cacheClient.ping();
    checks.redis = 'healthy';
  } catch {
    checks.redis = 'unhealthy';
  }

  try {
    checks.kafka = kafkaConsumer.isConnected() ? 'healthy' : 'unhealthy';
  } catch {
    checks.kafka = 'unhealthy';
  }

  const isHealthy = checks.database === 'healthy' && checks.redis === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    try {
      await dbPool.query('SELECT 1');
      connectionStatus.set({ service: 'postgres' }, 1);
    } catch {
      connectionStatus.set({ service: 'postgres' }, 0);
    }

    try {
      await cacheClient.ping();
      connectionStatus.set({ service: 'redis' }, 1);
    } catch {
      connectionStatus.set({ service: 'redis' }, 0);
    }

    connectionStatus.set({ service: 'kafka' }, kafkaConsumer.isConnected() ? 1 : 0);

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
    // Connect Redis clients
    await Promise.all([
      cacheClient.connect(),
      pubClient.connect(),
      subClient.connect(),
    ]);
    logger.info('Connected to Redis (cache + pubsub)');

    // Connect Kafka consumer and start listening
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe();
    logger.info('Kafka consumer running');

    // WebSocket server for GraphQL Subscriptions
    const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

    const wsServerCleanup = useServer(
      {
        schema,
        context: () => ({
          notificationService,
          subClient,
        }),
      },
      wsServer,
    );

    logger.info('WebSocket server ready for GraphQL Subscriptions');

    // Apollo Server (HTTP)
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
        context: async () => ({
          notificationService,
          subClient,
        }),
      }),
    );

    await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));

    logger.info(`Notification Service running on port ${PORT}`);
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
    cacheClient.quit(),
    pubClient.quit(),
    subClient.quit(),
    kafkaConsumer.disconnect(),
  ]);
  process.exit(0);
});

startServer();
