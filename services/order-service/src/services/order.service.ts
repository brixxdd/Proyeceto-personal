import { createClient } from 'redis';
import { Order, OrderStatus, CreateOrderInput } from '../models/order.model';
import { OrderRepository } from '../repositories/order.repository';
import { KafkaProducer } from '../events/kafka.producer';
import { RedisPubSub, orderStatusChannel } from '../pubsub/redis.pubsub';
import { logger } from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

export class OrderService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private orderRepository: OrderRepository,
    private redisClient: RedisClient,
    private kafkaProducer: KafkaProducer,
    private pubSub: RedisPubSub,
  ) {}

  async createOrder(input: CreateOrderInput, customerId: string): Promise<Order> {
    // TODO: En producción, consultar prices del restaurant-service
    // Por ahora, usar precio default y calcular subtotales
    const DEFAULT_ITEM_PRICE = 10.0;

    const itemsWithPrices = input.items.map((item) => {
      const price = item.price ?? DEFAULT_ITEM_PRICE;
      const subtotal = item.subtotal ?? price * item.quantity;
      return { ...item, price, subtotal };
    });

    // Calculate total amount
    const totalAmount = itemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0);

    const orderData: CreateOrderInput & { totalAmount: number } = {
      ...input,
      items: itemsWithPrices,
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

    // Notify GraphQL subscribers (real-time)
    await this.pubSub.publish(orderStatusChannel(id), order);

    // Publish appropriate Kafka event based on status
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

