import 'dotenv/config';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
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

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const kafkaProducer = kafka.producer();

// Initialize dependencies
const orderRepository = new OrderRepository(dbPool);
const kafkaProducerService = new KafkaProducer(kafkaProducer);
const orderService = new OrderService(orderRepository, redisClient, kafkaProducerService);
const orderResolver = new OrderResolver(orderService);

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

// Create resolvers
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
      subscribe: orderResolver.subscribeToOrderStatus.bind(orderResolver),
    },
  },
};

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await dbPool.query('SELECT 1');
    
    // Check Redis connection
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

async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Connect to Kafka
    await kafkaProducer.connect();
    logger.info('Connected to Kafka');

    // Run database migrations
    await Database.runMigrations(dbPool);
    logger.info('Database migrations completed');

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: process.env.NODE_ENV !== 'production',
    });

    await server.start();

    // Apply middleware
    app.use(
      '/graphql',
      cors(),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          // Extract user from JWT token (simplified)
          const token = req.headers.authorization?.replace('Bearer ', '');
          return {
            user: token ? { id: 'user-1' } : null, // Simplified - implement proper JWT validation
          };
        },
      })
    );

    app.listen(PORT, () => {
      logger.info(`Order Service running on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await dbPool.end();
  await redisClient.quit();
  await kafkaProducer.disconnect();
  process.exit(0);
});

startServer();

