import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import cors from 'cors';
import { logger } from './utils/logger';
import { getContextFromRequest } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

// Configure Apollo Gateway
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
      { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
      // TODO: Add order service when running
      // { name: 'order', url: process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql' },
    ],
  }),
  // Handle subgraph errors gracefully
  buildService({ name, url }) {
    const { RemoteGraphQLDataSource } = require('@apollo/gateway');
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }: { request: any; context: any }) {
        // Forward user context to subgraphs
        if (context.user) {
          request.http?.headers.set('x-user-id', context.user.userId);
          request.http?.headers.set('x-user-email', context.user.email);
          request.http?.headers.set('x-user-role', context.user.role);
        }
      },
    });
  },
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};
  let allHealthy = true;

  const subgraphs = [
    { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/graphql' },
    { name: 'restaurant', url: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3001/graphql' },
    // TODO: Add order service when running
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

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    checks,
  });
});

async function startServer() {
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
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
