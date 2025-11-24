import { createClient } from 'redis';
import { Order, OrderStatus, CreateOrderInput } from '../models/order.model';
import { OrderRepository } from '../repositories/order.repository';
import { KafkaProducer } from '../events/kafka.producer';
import { logger } from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

export class OrderService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private orderRepository: OrderRepository,
    private redisClient: RedisClient,
    private kafkaProducer: KafkaProducer
  ) {}

  async createOrder(input: CreateOrderInput, customerId: string): Promise<Order> {
    // Calculate total amount (simplified - in production, fetch prices from restaurant service)
    const totalAmount = input.items.reduce((sum, item) => {
      return sum + (item.subtotal || (item.price || 0) * item.quantity);
    }, 0);

    const orderData: CreateOrderInput & { totalAmount: number } = {
      ...input,
      totalAmount,
    };

    // Create order in database
    const order = await this.orderRepository.createOrder(orderData, customerId);

    // Cache order in Redis
    await this.cacheOrder(order);

    // Publish event to Kafka
    await this.kafkaProducer.publishOrderCreated({
      orderId: order.id,
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      totalAmount: order.totalAmount,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Order created: ${order.id}`);
    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    // Try cache first
    const cached = await this.getCachedOrder(id);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const order = await this.orderRepository.findById(id);
    
    if (order) {
      await this.cacheOrder(order);
    }

    return order;
  }

  async getOrders(customerId: string, status?: OrderStatus, limit = 20, offset = 0): Promise<Order[]> {
    return this.orderRepository.findByCustomerId(customerId, status, limit, offset);
  }

  async updateOrderStatus(id: string, status: OrderStatus, deliveryPersonId?: string): Promise<Order | null> {
    const order = await this.orderRepository.updateStatus(id, status, deliveryPersonId);
    
    if (!order) {
      return null;
    }

    // Update cache
    await this.cacheOrder(order);

    // Publish appropriate event based on status
    if (status === OrderStatus.ASSIGNED && deliveryPersonId) {
      await this.kafkaProducer.publishOrderAssigned({
        orderId: order.id,
        deliveryPersonId,
        timestamp: new Date().toISOString(),
      });
    } else if (status === OrderStatus.DELIVERED) {
      await this.kafkaProducer.publishOrderDelivered({
        orderId: order.id,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Order ${id} status updated to ${status}`);
    return order;
  }

  async cancelOrder(id: string): Promise<Order | null> {
    return this.updateOrderStatus(id, OrderStatus.CANCELLED);
  }

  private async cacheOrder(order: Order): Promise<void> {
    const key = `order:${order.id}`;
    await this.redisClient.setEx(key, this.CACHE_TTL, JSON.stringify(order));
  }

  private async getCachedOrder(id: string): Promise<Order | null> {
    const key = `order:${id}`;
    const cached = await this.redisClient.get(key);
    
    if (cached) {
      return JSON.parse(cached) as Order;
    }
    
    return null;
  }
}

