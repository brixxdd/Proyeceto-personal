import { DeliveryService } from '../services/delivery.service';
import { RedisPubSub, deliveryStatusChannel, driverAssignedChannel, myDeliveryUpdatesChannel } from '../pubsub/redis.pubsub';
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

  async getMyDeliveryPerson(
    _parent: unknown,
    args: { userId: string },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.getDeliveryPersonByUserId(args.userId);
  }

  async getMyDeliveries(
    _parent: unknown,
    args: { deliveryPersonId: string },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.getMyDeliveries(args.deliveryPersonId);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async createDeliveryPerson(
    _parent: unknown,
    args: { userId: string; name: string; vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR' },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.createDeliveryPerson(args.userId, args.name, args.vehicleType);
  }

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

  async acceptDelivery(
    _parent: unknown,
    args: { orderId: string; deliveryPersonId: string },
    _ctx: ResolverContext,
  ) {
    return this.deliveryService.acceptDelivery(args.orderId, args.deliveryPersonId);
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

  subscribeToMyDeliveryUpdates(
    _parent: unknown,
    args: { deliveryPersonId: string },
    ctx: ResolverContext,
  ) {
    return ctx.pubSub.asyncIterator(myDeliveryUpdatesChannel(args.deliveryPersonId));
  }
}
