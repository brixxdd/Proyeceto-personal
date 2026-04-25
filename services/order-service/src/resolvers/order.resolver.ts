import { Pool } from 'pg';
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
  constructor(
    private orderService: OrderService,
    private restaurantDbPool?: Pool
  ) { }

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

  async getRestaurantOrders(
    _parent: any,
    args: { restaurantId: string; status?: OrderStatus; limit?: number; offset?: number },
    context: Context
  ): Promise<Order[]> {
    const user = requireAuth(context.auth);

    // ADMIN puede ver cualquier pedido de cualquier restaurante
    if (user.role === 'ADMIN') {
      return this.orderService.getOrdersByRestaurantId(
        args.restaurantId,
        args.status,
        args.limit || 20,
        args.offset || 0
      );
    }

    // RESTAURANT_OWNER solo puede ver pedidos de SUS restaurantes
    if (user.role === 'RESTAURANT_OWNER') {
      if (!this.restaurantDbPool) {
        throw new Error('Restaurant database not configured');
      }
      // Verify this owner owns the requested restaurant
      const result = await this.restaurantDbPool.query(
        'SELECT owner_id FROM restaurants WHERE id = $1',
        [args.restaurantId]
      );
      if (result.rows.length === 0) {
        throw new Error('Restaurant not found');
      }
      if (result.rows[0].owner_id !== user.userId) {
        throw new Error('Forbidden: you do not own this restaurant');
      }
      return this.orderService.getOrdersByRestaurantId(
        args.restaurantId,
        args.status,
        args.limit || 20,
        args.offset || 0
      );
    }

    throw new Error('Forbidden: only ADMIN or RESTAURANT_OWNER can view restaurant orders');
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
    const user = requireAuth(context.auth);

    const order = await this.orderService.getOrderById(args.id);
    if (!order) return null;

    // ADMIN can update any order
    if (user.role === 'ADMIN') {
      return this.orderService.updateOrderStatus(args.id, args.status);
    }

    // RESTAURANT_OWNER can only update orders for their own restaurants
    if (user.role === 'RESTAURANT_OWNER') {
      if (!this.restaurantDbPool) {
        throw new Error('Restaurant database not configured');
      }
      const result = await this.restaurantDbPool.query(
        'SELECT owner_id FROM restaurants WHERE id = $1',
        [order.restaurantId]
      );
      if (result.rows.length === 0) {
        throw new Error('Restaurant not found');
      }
      if (result.rows[0].owner_id !== user.userId) {
        throw new Error('Forbidden: you do not own this restaurant');
      }
      return this.orderService.updateOrderStatus(args.id, args.status);
    }

    throw new Error('Forbidden: only ADMIN or RESTAURANT_OWNER can update order status');
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
