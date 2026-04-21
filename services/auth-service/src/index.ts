import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import cors from 'cors';
import http from 'http';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { parse } from 'graphql';
import { collectDefaultMetrics, Registry } from 'prom-client';
import { logger } from './utils/logger';
import { typeDefs } from './schema';
import { resolvers, initializeResolvers } from './resolvers';
import { getAuthContext, AuthContext } from './middleware/auth';
import { initializeRedis } from './services/redis.service';

const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

const app = express();
const PORT = process.env.PORT || 3002;

// Database connection
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis connected'));

(async () => {
  try {
    await redisClient.connect();
    initializeRedis(redisClient as any);
  } catch (error) {
    logger.warn('Failed to connect to Redis, continuing without it', { error: (error as Error).message });
  }
})();

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (err) {
    res.status(500).end(err);
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

  // Check Redis
  try {
    await redisClient.ping();
    checks.redis = 'healthy';
  } catch (error) {
    checks.redis = 'unhealthy';
  }

  const isHealthy = checks.database === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Apollo Server
async function startServer() {
  // Initialize resolvers with DB pool
  initializeResolvers(dbPool);

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
        const auth = await getAuthContext(req.headers.authorization);
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        return { auth, ip };
      },
    })
  );

  await httpServer.listen({ port: PORT });
  logger.info(`Auth Service running on port ${PORT}`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
