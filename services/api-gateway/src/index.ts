import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import cors from 'cors';
import { createClient, RedisClientType } from 'redis';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { logger } from './utils/logger';
import { getContextFromRequest } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

// Redis client for rate limiting
let redisClient: RedisClientType | null = null;

async function initializeRedis(): Promise<RedisClientType | null> {
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    client.on('error', (err) => logger.error('Redis error', err));
    client.on('connect', () => logger.info('Redis connected for rate limiting'));

    await client.connect();
    return client;
  } catch (error) {
    logger.warn('Failed to connect to Redis, rate limiting disabled', {
      error: (error as Error).message,
    });
    return null;
  }
}

// Rate limiting middleware
function setupRateLimiter(redis: RedisClientType | null) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 min
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  if (redis) {
    // Redis-backed rate limiter
    const limiter = rateLimit({
      store: new RedisStore({
        // @ts-ignore - rate-limit-redis types compatibility
        sendCommand: (...args: string[]) => redis.sendCommand(args),
      }) as any,
      windowMs,
      max: maxRequests,
      message: { error: 'Too many requests, please try again later' },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Rate limit by user if authenticated, otherwise by IP
        const authHeader = req.headers.authorization;
        if (authHeader) {
          try {
            const { verifyToken } = require('./middleware/auth');
            const token = authHeader.replace('Bearer ', '');
            const decoded = verifyToken(token);
            return `user:${decoded.userId}`;
          } catch {
            // Fall back to IP
          }
        }
        return `ip:${req.ip || 'unknown'}`;
      },
    });
    return limiter;
  }

  // In-memory rate limiter (development only)
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Configure Apollo Gateway with all 3 subgraphs
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
      { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
      { name: 'order', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql' },
    ],
  }),
  // Handle subgraph errors gracefully
  buildService({ name, url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }: { request: any; context: any }) {
        // Forward user context to subgraphs
        if (context?.user) {
          request.http?.headers.set('x-user-id', context.user.userId);
          request.http?.headers.set('x-user-email', context.user.email);
          request.http?.headers.set('x-user-role', context.user.role);
        }
      },
    });
  },
});

// Health check endpoint - checks all 3 subgraphs
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};
  let allHealthy = true;

  const subgraphs = [
    { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
    { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
    { name: 'order', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql' },
  ];

  for (const subgraph of subgraphs) {
    try {
      const response = await fetch(subgraph.url.replace('/graphql', '/health'));
      const data = await response.json() as { status: string };
      if (data.status === 'healthy') {
        checks[subgraph.name] = 'healthy';
      } else {
        checks[subgraph.name] = 'unhealthy';
        allHealthy = false;
      }
    } catch (error) {
      checks[subgraph.name] = 'unreachable';
      allHealthy = false;
    }
  }

  // Check Redis
  if (redisClient?.isOpen) {
    try {
      await redisClient.ping();
      checks.redis = 'healthy';
    } catch {
      checks.redis = 'unhealthy';
    }
  } else {
    checks.redis = 'disconnected';
  }

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    checks,
  });
});

async function startServer() {
  // Initialize Redis
  redisClient = await initializeRedis();

  // Setup rate limiting
  const rateLimiter = setupRateLimiter(redisClient);
  app.use(rateLimiter);

  // Start Apollo Server
  const server = new ApolloServer({
    gateway,
    introspection: process.env.NODE_ENV !== 'production',
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        return getContextFromRequest(req.headers.authorization);
      },
    })
  );

  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
    logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    logger.info(`Subgraphs: auth(${process.env.AUTH_SERVICE_URL || 'localhost:3002'}), restaurant(${process.env.RESTAURANT_SERVICE_URL || 'localhost:3001'}), order(${process.env.ORDER_SERVICE_URL || 'localhost:3000'})`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
