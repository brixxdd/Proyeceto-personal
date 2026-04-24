import { OrderService } from '../services/order.service';
import { RedisPubSub, orderStatusChannel } from '../pubsub/redis.pubsub';
import { Order, OrderStatus, CreateOrderInput } from '../models/order.model';
import { requireAuth, AuthContext, JwtPayload } from '../middleware/auth';

interface Context {
  auth: AuthContext;
  user?: JwtPayload | null;
  pubSub: RedisPubSub;
}

export class OrderResolver {
  constructor(private orderService: OrderService) {}

  async getOrders(
    _parent: any,
    args: { status?: OrderStatus; limit?: number; offset?: number },
    context: Context
  ): Promise<Order[]> {
    const user = requireAuth(context.auth);

    // Si es ADMIN, obtenemos todos los pedidos sin filtrar por customerId
    if (user.role === 'ADMIN') {
      return this.orderService.getOrders(
        '', // customerId vacío para indicar que es admin
        args.status,
        args.limit || 20,
        args.offset || 0,
        true // is admin flag
      );
    }

    return this.orderService.getOrders(
      user.userId,
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
    const user = requireAuth(context.auth);

    const order = await this.orderService.getOrderById(args.id);

    // Verify order belongs to user (or user is admin/restaurant owner)
    if (order && order.customerId !== user.userId && user.role !== 'ADMIN') {
      throw new Error('Forbidden');
    }

    return order;
  }

  async createOrder(
    _parent: any,
    args: { input: CreateOrderInput },
    context: Context
  ): Promise<Order> {
    const user = requireAuth(context.auth);

    return this.orderService.createOrder(args.input, user.userId);
  }

  async updateOrderStatus(
    _parent: any,
    args: { id: string; status: OrderStatus },
    context: Context
  ): Promise<Order | null> {
    requireAuth(context.auth);

    // In production, check if user has permission (restaurant owner, admin, etc.)
    return this.orderService.updateOrderStatus(args.id, args.status);
  }

  async cancelOrder(
    _parent: any,
    args: { id: string },
    context: Context
  ): Promise<Order | null> {
    const user = requireAuth(context.auth);

    const order = await this.orderService.getOrderById(args.id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.customerId !== user.userId) {
      throw new Error('Forbidden');
    }

    return this.orderService.cancelOrder(args.id);
  }

  subscribeToOrderStatus(
    _parent: unknown,
    args: { orderId: string },
    context: Context,
  ): AsyncIterable<Order> {
    requireAuth(context.auth);
    // PubSubAsyncIterableIterator implements both AsyncIterator and AsyncIterable at runtime;
    // the base-class types only declare AsyncIterator, so we cast through unknown.
    return context.pubSub.asyncIterator<Order>(
      orderStatusChannel(args.orderId),
    ) as unknown as AsyncIterable<Order>;
  }
}

