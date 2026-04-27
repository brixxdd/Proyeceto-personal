import { Delivery, DeliveryPerson, DeliveryStatus, DriverStatus, Location, VehicleType } from '../models/delivery.model';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { KafkaProducer } from '../events/kafka.producer';
import { RedisPubSub, deliveryStatusChannel, driverAssignedChannel, myDeliveryUpdatesChannel } from '../pubsub/redis.pubsub';
import { logger } from '../utils/logger';
import { deliveryAssignmentsTotal, activeDeliveries, availableDrivers } from '../metrics/prometheus';

export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly kafkaProducer: KafkaProducer,
    private readonly pubSub: RedisPubSub,
  ) {}

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

  async getMyDeliveries(deliveryPersonId: string): Promise<Delivery[]> {
    return this.repo.findDeliveries({ deliveryPersonId });
  }

  async acceptDelivery(deliveryId: string, deliveryPersonId: string): Promise<Delivery> {
    const delivery = await this.repo.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }
    if (delivery.status !== 'PENDING') {
      throw new Error(`Delivery ${deliveryId} is not available for acceptance`);
    }

    const updated = await this.repo.updateDelivery({
      id: deliveryId,
      deliveryPersonId,
      status: 'ASSIGNED',
    });

    if (!updated) {
      throw new Error(`Failed to accept delivery ${deliveryId}`);
    }

    await this.repo.updateDriverStatus(deliveryPersonId, 'BUSY');
    await this.pubSub.publish(deliveryStatusChannel(deliveryId), updated);

    return updated;
  }

  async getDeliveries(filters: {
    orderId?: string;
    status?: DeliveryStatus;
    deliveryPersonId?: string;
  }): Promise<Delivery[]> {
    return this.repo.findDeliveries(filters);
  }
}
