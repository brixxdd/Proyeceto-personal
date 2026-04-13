import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import cors from 'cors';
import http from 'http';
import { Pool } from 'pg';
import { parse } from 'graphql';
import { logger } from './utils/logger';
import { typeDefs } from './schema';
import { resolvers, initializeResolvers } from './resolvers';
import { RestaurantService } from './services/restaurant.service';
import { RestaurantKafkaProducer } from './events/kafka.producer';
import { register, connectionStatus } from './metrics/prometheus';

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Kafka producer
const kafkaProducer = new RestaurantKafkaProducer();

// Initialize service
const restaurantService = new RestaurantService(
  dbPool,
  process.env.REDIS_URL || 'redis://localhost:6379',
  parseInt(process.env.CACHE_TTL || '300'),
  kafkaProducer
);

// Metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};

  // Check DB
  try {
    await dbPool.query('SELECT 1');
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
  }

  // Check Redis (ping)
  try {
    await restaurantService['redis'].ping();
    checks.redis = 'healthy';
  } catch (error) {
    checks.redis = 'unhealthy';
  }

  const isHealthy = checks.database === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'restaurant-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Apollo Server
async function startServer() {
  await restaurantService.initialize();
  await kafkaProducer.connect();
  initializeResolvers(restaurantService);

  // Set initial connection gauges
  connectionStatus.set({ service: 'kafka' }, kafkaProducer.isConnected() ? 1 : 0);

  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs: parse(typeDefs), resolvers }]),
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    introspection: process.env.NODE_ENV !== 'production',
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const userId = req.headers['x-user-id'] as string | undefined;
        const email = req.headers['x-user-email'] as string | undefined;
        const role = req.headers['x-user-role'] as string | undefined;
        return {
          user: userId ? { userId, email, role } : null,
        };
      },
    })
  );

  await httpServer.listen({ port: PORT });
  logger.info(`Restaurant Service running on port ${PORT}`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
