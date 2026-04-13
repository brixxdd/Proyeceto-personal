import { DeliveryService } from '../services/delivery.service';
import { RedisPubSub, deliveryStatusChannel, driverAssignedChannel } from '../pubsub/redis.pubsub';
import { DeliveryStatus, DriverStatus, Location } from '../models/delivery.model';
import { AuthContext } from '../middleware/auth';

interface ResolverContext {
  auth: AuthContext;
  pubSub: RedisPubSub;
}

export class DeliveryResolver {
  constructor(private readonly deliveryService: DeliveryService) {}

  // ── Queries ───────────────────────────────────────────────────────────────

  async getDelivery(
    _parent: unknown,
    args: { id: string },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.getDeliveryById(args.id);
  }

  async getDeliveries(
    _parent: unknown,
    args: { orderId?: string; status?: DeliveryStatus },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.getDeliveries({
      orderId: args.orderId,
      status: args.status,
    });
  }

  async getAvailableDrivers(
    _parent: unknown,
    _args: Record<string, never>,
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.getAvailableDrivers();
  }

  async getDeliveryPerson(
    _parent: unknown,
    args: { id: string },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.getDeliveryPersonById(args.id);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async updateDriverStatus(
    _parent: unknown,
    args: { id: string; status: DriverStatus; location?: Location },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.updateDriverStatus(args.id, args.status, args.location);
  }

  async updateDeliveryStatus(
    _parent: unknown,
    args: { id: string; status: DeliveryStatus },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.updateDeliveryStatus(args.id, args.status);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribeToDeliveryStatus(
    _parent: unknown,
    args: { deliveryId: string },
    ctx: ResolverContext,
  ) {
    return ctx.pubSub.asyncIterator(deliveryStatusChannel(args.deliveryId));
  }

  subscribeToDriverAssigned(
    _parent: unknown,
    args: { orderId: string },
    ctx: ResolverContext,
  ) {
    return ctx.pubSub.asyncIterator(driverAssignedChannel(args.orderId));
  }
}
