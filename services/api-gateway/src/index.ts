import './tracing';
import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import cors from 'cors';
import { createClient as createRedisClient } from 'redis';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { collectDefaultMetrics, Registry } from 'prom-client';
import { logger } from './utils/logger';
import { getContextFromRequest } from './middleware/auth';

const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

const app = express();
const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);
const ORDER_SERVICE_WS_URL =
  process.env.ORDER_SERVICE_WS_URL || 'ws://order-service:3000/graphql';

// Redis client for rate limiting
let redisClient: any = null;

async function initializeRedis(): Promise<any> {
  try {
    const client = createRedisClient({
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
function setupRateLimiter(_redis: any) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 min
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

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
  buildService({ name, url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }: { request: any; context: any }) {
        if (context?.user) {
          request.http?.headers.set('x-user-id', context.user.userId);
          request.http?.headers.set('x-user-email', context.user.email);
          request.http?.headers.set('x-user-role', context.user.role);
        }
      },
    });
  },
});

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
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
  redisClient = await initializeRedis();

  const rateLimiter = setupRateLimiter(redisClient);
  app.use(rateLimiter);

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

  // ── WebSocket proxy for GraphQL Subscriptions ───────────────────────────
  // Apollo Federation gateway does not natively support subscription forwarding.
  // Raw WebSocket proxy: pipe graphql-transport-ws messages bidirectionally
  // to the order-service. Auth token in connection_init flows through as-is.
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
    handleProtocols: (protocols) => {
      if (protocols.has('graphql-transport-ws')) return 'graphql-transport-ws';
      if (protocols.has('graphql-ws')) return 'graphql-ws';
      return false;
    },
  });

  wsServer.on('connection', (downstream) => {
    const protocol = downstream.protocol || 'graphql-transport-ws';
    const upstream = new WebSocket(ORDER_SERVICE_WS_URL, protocol);
    const queue: WebSocket.RawData[] = [];

    upstream.on('open', () => {
      for (const msg of queue) upstream.send(msg);
      queue.length = 0;
    });

    downstream.on('message', (data) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data);
      } else {
        queue.push(data);
      }
    });

    upstream.on('message', (data) => {
      if (downstream.readyState === WebSocket.OPEN) downstream.send(data);
    });

    downstream.on('close', (code, reason) => {
      if (upstream.readyState < WebSocket.CLOSING) upstream.close(code, reason);
    });
    upstream.on('close', (code, reason) => {
      logger.warn('WS upstream closed', { code, reason: reason?.toString() });
      if (downstream.readyState < WebSocket.CLOSING) downstream.close(code, reason);
    });

    downstream.on('error', (err) => logger.error('WS downstream error', err));
    upstream.on('error', (err) => {
      logger.error('WS upstream error', { error: err.message, code: (err as any).code });
    });
  });

  logger.info(`WebSocket subscription proxy ready — upstream: ${ORDER_SERVICE_WS_URL}`);

  await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));

  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  logger.info(`GraphQL WebSocket: ws://localhost:${PORT}/graphql`);
  logger.info(`Subgraphs: auth(${process.env.AUTH_SERVICE_URL || 'localhost:3002'}), restaurant(${process.env.RESTAURANT_SERVICE_URL || 'localhost:3001'}), order(${process.env.ORDER_SERVICE_URL || 'localhost:3000'})`);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down api-gateway');
    wsServer.close();
    process.exit(0);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
