import { Delivery, DeliveryPerson, DeliveryStatus, DriverStatus, Location, VehicleType } from '../models/delivery.model';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { KafkaProducer } from '../events/kafka.producer';
import { RedisPubSub, deliveryStatusChannel, driverAssignedChannel, myDeliveryUpdatesChannel, newAvailableDeliveryChannel } from '../pubsub/redis.pubsub';
import { fetchOrderDetails } from '../clients/order.client';
import { logger } from '../utils/logger';
import { deliveryAssignmentsTotal, activeDeliveries, availableDrivers } from '../metrics/prometheus';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3000/graphql';

export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly kafkaProducer: KafkaProducer,
    private readonly pubSub: RedisPubSub,
  ) { }

  /**
   * Picks a random available driver, creates a delivery record, and sets the
   * driver to BUSY. Called by the Kafka consumer on `order.created`.
   */
  async assignDelivery(orderId: string): Promise<Delivery | null> {
    const driver = await this.repo.findAvailableDriver();
    if (!driver) {
      logger.warn(`No available drivers for order ${orderId}`);
      return null;
    }

    const delivery = await this.repo.createDelivery({
      orderId,
      deliveryPersonId: driver.id,
      status: 'ASSIGNED',
    });

    await this.repo.updateDriverStatus(driver.id, 'BUSY');

    // Publish Kafka event
    await this.kafkaProducer.publishDeliveryAssigned({
      orderId,
      deliveryPersonId: driver.id,
      estimatedMinutes: 25,
      timestamp: new Date().toISOString(),
    });

    // Publish GraphQL subscription event
    await this.pubSub.publish(driverAssignedChannel(orderId), delivery);

    // Broadcast to ALL delivery people that a new delivery is available
    await this.pubSub.publish(newAvailableDeliveryChannel(), delivery);

    // Update Prometheus metrics
    deliveryAssignmentsTotal.inc({ status: 'ASSIGNED' });
    const active = await this.repo.countActiveDeliveries();
    activeDeliveries.set(active);
    const avail = await this.repo.countAvailableDrivers();
    availableDrivers.set(avail);

    logger.info(`Delivery ${delivery.id} assigned to driver ${driver.id} for order ${orderId}`);
    return delivery;
  }

  /**
   * Cancels a delivery and releases the driver. Called on `order.cancelled`.
   */
  async cancelDelivery(orderId: string): Promise<void> {
    const delivery = await this.repo.findDeliveryByOrderId(orderId);
    if (!delivery) {
      logger.warn(`No delivery found for order ${orderId}, nothing to cancel`);
      return;
    }
    if (delivery.status === 'DELIVERED') {
      logger.warn(`Delivery ${delivery.id} already delivered, cannot cancel`);
      return;
    }

    await this.repo.updateDeliveryStatus(delivery.id, 'CANCELLED');
    await this.repo.updateDriverStatus(delivery.deliveryPersonId, 'AVAILABLE');

    const active = await this.repo.countActiveDeliveries();
    activeDeliveries.set(active);
    const avail = await this.repo.countAvailableDrivers();
    availableDrivers.set(avail);

    logger.info(`Delivery ${delivery.id} cancelled, driver ${delivery.deliveryPersonId} released`);
  }

  async updateDeliveryStatus(id: string, status: DeliveryStatus): Promise<Delivery> {
    const delivery = await this.repo.updateDeliveryStatus(id, status);
    if (!delivery) {
      throw new Error(`Delivery ${id} not found`);
    }

    // Publish GraphQL subscription event
    await this.pubSub.publish(deliveryStatusChannel(id), delivery);
    await this.pubSub.publish(myDeliveryUpdatesChannel(delivery.deliveryPersonId), delivery);

    // Map delivery status → order status and sync to order-service via HTTP
    const orderStatusMap: Record<DeliveryStatus, string> = {
      PENDING: 'PENDING',
      ASSIGNED: 'ASSIGNED',
      PICKED_UP: 'PICKED_UP',
      IN_TRANSIT: 'IN_TRANSIT',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    };
    const orderStatus = orderStatusMap[status];
    if (orderStatus) {
      try {
        const mutation = `
          mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
            updateOrderStatus(id: $id, status: $status) { id status }
          }
        `;
        const authHeaders = {
          'x-user-id': 'a0000000-0000-0000-0000-000000000001',
          'x-user-email': 'admin@fooddash.com',
          'x-user-role': 'ADMIN',
        };
        const order = await fetchOrderDetails(delivery.orderId, ORDER_SERVICE_URL, authHeaders);
        await fetch(`${ORDER_SERVICE_URL}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            query: mutation,
            variables: { id: order.id, status: orderStatus },
          }),
        });
        logger.info(`Synced delivery status ${status} → order ${order.id}`);
      } catch (err) {
        logger.error(`Failed to sync delivery status to order-service for delivery ${id}`, err);
      }
    }

    // When delivered, release the driver
    if (status === 'DELIVERED') {
      await this.repo.updateDriverStatus(delivery.deliveryPersonId, 'AVAILABLE');
    }

    const active = await this.repo.countActiveDeliveries();
    activeDeliveries.set(active);
    const avail = await this.repo.countAvailableDrivers();
    availableDrivers.set(avail);

    return delivery;
  }

  async updateDriverStatus(
    id: string,
    status: DriverStatus,
    location?: Location,
  ): Promise<DeliveryPerson> {
    const driver = await this.repo.updateDriverStatus(id, status, location);
    if (!driver) {
      throw new Error(`Driver ${id} not found`);
    }
    const avail = await this.repo.countAvailableDrivers();
    availableDrivers.set(avail);
    return driver;
  }

  async getAvailableDrivers(): Promise<DeliveryPerson[]> {
    return this.repo.findAvailableDrivers();
  }

  async getAvailableDeliveries(): Promise<Delivery[]> {
    return this.repo.findAvailableDeliveries();
  }

  async getDeliveryById(id: string): Promise<Delivery | null> {
    return this.repo.findDeliveryById(id);
  }

  async getDeliveryPersonById(id: string): Promise<DeliveryPerson | null> {
    return this.repo.findDeliveryPersonById(id);
  }

  async getDeliveryPersonByUserId(userId: string): Promise<DeliveryPerson | null> {
    return this.repo.findDeliveryPersonByUserId(userId);
  }

  async createDeliveryPerson(
    userId: string,
    name: string,
    vehicleType: VehicleType,
  ): Promise<DeliveryPerson> {
    return this.repo.createDeliveryPerson({ userId, name, vehicleType });
  }

  /**
   * Creates a PENDING delivery record when an order is CONFIRMED (pre-create for idempotency).
   * Does NOT broadcast — drivers only see it when order becomes READY via handleOrderReady.
   */
  async createPendingDelivery(orderId: string, orderStatus = 'PENDING'): Promise<Delivery | null> {
    const existing = await this.repo.findDeliveryByOrderId(orderId);
    if (existing) {
      // Already exists, no need to create again
      return existing;
    }

    const delivery = await this.repo.createPendingDelivery(orderId, orderStatus);
    if (delivery) {
      const avail = await this.repo.countAvailableDrivers();
      availableDrivers.set(avail);
    }

    return delivery;
  }

  /**
   * Broadcasts an existing PENDING delivery to all drivers.
   * Called when order transitions to READY so drivers finally see it.
   */
  async broadcastAvailableDelivery(orderId: string): Promise<void> {
    const delivery = await this.repo.findDeliveryByOrderId(orderId);
    if (!delivery) {
      logger.warn(`No delivery found for order ${orderId} to broadcast`);
      return;
    }
    await this.pubSub.publish(newAvailableDeliveryChannel(), delivery);
  }

  async updateDeliveryOrderStatus(orderId: string, orderStatus: string): Promise<void> {
    await this.repo.updateDeliveryOrderStatus(orderId, orderStatus);
  }

  async getMyDeliveries(deliveryPersonId: string): Promise<Delivery[]> {
    return this.repo.findDeliveries({ deliveryPersonId });
  }

  async acceptDelivery(orderId: string, deliveryPersonId: string): Promise<Delivery> {
    // First find the delivery by orderId to get its UUID
    const deliveryRecord = await this.repo.findDeliveryByOrderId(orderId);
    if (!deliveryRecord) {
      throw new Error(`No delivery found for order ${orderId}`);
    }
    if (deliveryRecord.status !== 'PENDING' || deliveryRecord.deliveryPersonId) {
      throw new Error(`Delivery ${deliveryRecord.id} is no longer available`);
    }

    // Use atomic claim — DB-level check ensures only ONE driver gets the delivery
    const delivery = await this.repo.claimDelivery(deliveryRecord.id, deliveryPersonId);
    if (!delivery) {
      throw new Error(`Delivery ${deliveryRecord.id} is no longer available`);
    }

    await this.repo.updateDriverStatus(deliveryPersonId, 'BUSY');

    // Publish Kafka event so order-service can update order.status = ASSIGNED
    await this.kafkaProducer.publishDeliveryAssigned({
      orderId,
      deliveryPersonId,
      estimatedMinutes: 25,
      timestamp: new Date().toISOString(),
    });

    // Publish GraphQL subscription events
    await this.pubSub.publish(deliveryStatusChannel(delivery.id), delivery);
    await this.pubSub.publish(myDeliveryUpdatesChannel(deliveryPersonId), delivery);

    return delivery;
  }

  async getDeliveries(filters: {
    orderId?: string;
    status?: DeliveryStatus;
    deliveryPersonId?: string;
  }): Promise<Delivery[]> {
    return this.repo.findDeliveries(filters);
  }
}
