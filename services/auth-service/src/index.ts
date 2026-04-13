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
import { logger } from './utils/logger';
import { typeDefs } from './schema';
import { resolvers, initializeResolvers } from './resolvers';
import { getAuthContext, AuthContext } from './middleware/auth';

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
  } catch (error) {
    logger.warn('Failed to connect to Redis, continuing without it', { error: (error as Error).message });
  }
})();

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
    schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
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
        return { auth };
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
