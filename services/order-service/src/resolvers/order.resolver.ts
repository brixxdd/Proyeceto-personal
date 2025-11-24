import { OrderService } from '../services/order.service';
import { Order, OrderStatus, CreateOrderInput } from '../models/order.model';

interface Context {
  user?: {
    id: string;
  };
}

export class OrderResolver {
  constructor(private orderService: OrderService) {}

  async getOrders(
    _parent: any,
    args: { status?: OrderStatus; limit?: number; offset?: number },
    context: Context
  ): Promise<Order[]> {
    if (!context.user) {
      throw new Error('Unauthorized');
    }

    return this.orderService.getOrders(
      context.user.id,
      args.status,
      args.limit || 20,
      args.offset || 0
    );
  }

  async getOrderById(
    _parent: any,
    args: { id: string },
    context: Context
  ): Promise<Order | null> {
    if (!context.user) {
      throw new Error('Unauthorized');
    }

    const order = await this.orderService.getOrderById(args.id);
    
    // Verify order belongs to user (or user is admin/restaurant owner)
    if (order && order.customerId !== context.user.id) {
      throw new Error('Forbidden');
    }

    return order;
  }

  async createOrder(
    _parent: any,
    args: { input: CreateOrderInput },
    context: Context
  ): Promise<Order> {
    if (!context.user) {
      throw new Error('Unauthorized');
    }

    return this.orderService.createOrder(args.input, context.user.id);
  }

  async updateOrderStatus(
    _parent: any,
    args: { id: string; status: OrderStatus },
    context: Context
  ): Promise<Order | null> {
    if (!context.user) {
      throw new Error('Unauthorized');
    }

    // In production, check if user has permission (restaurant owner, admin, etc.)
    return this.orderService.updateOrderStatus(args.id, args.status);
  }

  async cancelOrder(
    _parent: any,
    args: { id: string },
    context: Context
  ): Promise<Order | null> {
    if (!context.user) {
      throw new Error('Unauthorized');
    }

    const order = await this.orderService.getOrderById(args.id);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.customerId !== context.user.id) {
      throw new Error('Forbidden');
    }

    return this.orderService.cancelOrder(args.id);
  }

  async subscribeToOrderStatus(
    _parent: any,
    _args: { orderId: string },
    context: Context
  ): Promise<AsyncIterator<Order>> {
    if (!context.user) {
      throw new Error('Unauthorized');
    }

    // Simplified subscription - in production, use GraphQL subscriptions with PubSub
    // This is a placeholder that would need proper implementation with Redis Pub/Sub or similar
    throw new Error('Subscriptions not fully implemented yet');
  }
}

