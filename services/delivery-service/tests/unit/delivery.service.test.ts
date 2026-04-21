import { DeliveryService } from '../../src/services/delivery.service';
import { DeliveryRepository } from '../../src/repositories/delivery.repository';
import { KafkaProducer } from '../../src/events/kafka.producer';
import { RedisPubSub } from '../../src/pubsub/redis.pubsub';
import { Delivery, DeliveryPerson } from '../../src/models/delivery.model';

// Mock metrics to avoid prom-client registry conflicts in tests
jest.mock('../../src/metrics/prometheus', () => ({
  deliveryAssignmentsTotal: { inc: jest.fn() },
  activeDeliveries: { set: jest.fn() },
  availableDrivers: { set: jest.fn() },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const makeDriver = (overrides: Partial<DeliveryPerson> = {}): DeliveryPerson => ({
  id: 'driver-1',
  name: 'John Driver',
  status: 'AVAILABLE',
  currentLocation: null,
  rating: 4.8,
  vehicleType: 'MOTORCYCLE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const makeDelivery = (overrides: Partial<Delivery> = {}): Delivery => ({
  id: 'delivery-1',
  orderId: 'order-1',
  deliveryPersonId: 'driver-1',
  status: 'ASSIGNED',
  pickupTime: null,
  deliveryTime: null,
  currentLocation: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('DeliveryService', () => {
  let service: DeliveryService;
  let repo: jest.Mocked<DeliveryRepository>;
  let kafkaProducer: jest.Mocked<KafkaProducer>;
  let pubSub: jest.Mocked<RedisPubSub>;

  beforeEach(() => {
    repo = {
      findAvailableDriver: jest.fn(),
      findAvailableDrivers: jest.fn(),
      findDeliveryPersonById: jest.fn(),
      createDelivery: jest.fn(),
      updateDriverStatus: jest.fn(),
      findDeliveryById: jest.fn(),
      findDeliveryByOrderId: jest.fn(),
      findDeliveries: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      countActiveDeliveries: jest.fn(),
      countAvailableDrivers: jest.fn(),
    } as unknown as jest.Mocked<DeliveryRepository>;

    kafkaProducer = {
      publishDeliveryAssigned: jest.fn().mockResolvedValue({ success: true, eventId: 'evt-1' }),
      isConnected: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<KafkaProducer>;

    pubSub = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RedisPubSub>;

    service = new DeliveryService(repo, kafkaProducer, pubSub);
  });

  describe('assignDelivery', () => {
    it('should assign driver and create delivery', async () => {
      const driver = makeDriver();
      const delivery = makeDelivery();

      repo.findAvailableDriver.mockResolvedValue(driver);
      repo.createDelivery.mockResolvedValue(delivery);
      repo.updateDriverStatus.mockResolvedValue({ ...driver, status: 'BUSY' });
      repo.countActiveDeliveries.mockResolvedValue(1);
      repo.countAvailableDrivers.mockResolvedValue(3);

      const result = await service.assignDelivery('order-1');

      expect(repo.findAvailableDriver).toHaveBeenCalled();
      expect(repo.createDelivery).toHaveBeenCalledWith({
        orderId: 'order-1',
        deliveryPersonId: 'driver-1',
        status: 'ASSIGNED',
      });
      expect(repo.updateDriverStatus).toHaveBeenCalledWith('driver-1', 'BUSY');
      expect(kafkaProducer.publishDeliveryAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1', deliveryPersonId: 'driver-1' }),
      );
      expect(pubSub.publish).toHaveBeenCalled();
      expect(result).toEqual(delivery);
    });

    it('should return null when no driver available', async () => {
      repo.findAvailableDriver.mockResolvedValue(null);

      const result = await service.assignDelivery('order-1');

      expect(result).toBeNull();
      expect(repo.createDelivery).not.toHaveBeenCalled();
      expect(kafkaProducer.publishDeliveryAssigned).not.toHaveBeenCalled();
    });

    it('should update prometheus metrics after assignment', async () => {
      const { deliveryAssignmentsTotal, activeDeliveries, availableDrivers } =
        jest.requireMock('../../src/metrics/prometheus');

      repo.findAvailableDriver.mockResolvedValue(makeDriver());
      repo.createDelivery.mockResolvedValue(makeDelivery());
      repo.updateDriverStatus.mockResolvedValue(makeDriver({ status: 'BUSY' }));
      repo.countActiveDeliveries.mockResolvedValue(2);
      repo.countAvailableDrivers.mockResolvedValue(4);

      await service.assignDelivery('order-2');

      expect(deliveryAssignmentsTotal.inc).toHaveBeenCalledWith({ status: 'ASSIGNED' });
      expect(activeDeliveries.set).toHaveBeenCalledWith(2);
      expect(availableDrivers.set).toHaveBeenCalledWith(4);
    });
  });

  describe('cancelDelivery', () => {
    it('should cancel delivery and release driver', async () => {
      const delivery = makeDelivery({ status: 'ASSIGNED' });

      repo.findDeliveryByOrderId.mockResolvedValue(delivery);
      repo.updateDeliveryStatus.mockResolvedValue({ ...delivery, status: 'CANCELLED' });
      repo.updateDriverStatus.mockResolvedValue(makeDriver());
      repo.countActiveDeliveries.mockResolvedValue(0);
      repo.countAvailableDrivers.mockResolvedValue(5);

      await service.cancelDelivery('order-1');

      expect(repo.updateDeliveryStatus).toHaveBeenCalledWith('delivery-1', 'CANCELLED');
      expect(repo.updateDriverStatus).toHaveBeenCalledWith('driver-1', 'AVAILABLE');
    });

    it('should do nothing when no delivery found for order', async () => {
      repo.findDeliveryByOrderId.mockResolvedValue(null);

      await service.cancelDelivery('order-nonexistent');

      expect(repo.updateDeliveryStatus).not.toHaveBeenCalled();
      expect(repo.updateDriverStatus).not.toHaveBeenCalled();
    });

    it('should do nothing when delivery already delivered', async () => {
      const delivery = makeDelivery({ status: 'DELIVERED' });
      repo.findDeliveryByOrderId.mockResolvedValue(delivery);

      await service.cancelDelivery('order-1');

      expect(repo.updateDeliveryStatus).not.toHaveBeenCalled();
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update status and publish subscription event', async () => {
      const delivery = makeDelivery({ status: 'PICKED_UP' });
      repo.updateDeliveryStatus.mockResolvedValue(delivery);
      repo.countActiveDeliveries.mockResolvedValue(1);
      repo.countAvailableDrivers.mockResolvedValue(3);

      const result = await service.updateDeliveryStatus('delivery-1', 'PICKED_UP');

      expect(repo.updateDeliveryStatus).toHaveBeenCalledWith('delivery-1', 'PICKED_UP');
      expect(pubSub.publish).toHaveBeenCalled();
      expect(result).toEqual(delivery);
    });

    it('should release driver when status is DELIVERED', async () => {
      const delivery = makeDelivery({ status: 'DELIVERED' });
      repo.updateDeliveryStatus.mockResolvedValue(delivery);
      repo.updateDriverStatus.mockResolvedValue(makeDriver());
      repo.countActiveDeliveries.mockResolvedValue(0);
      repo.countAvailableDrivers.mockResolvedValue(5);

      await service.updateDeliveryStatus('delivery-1', 'DELIVERED');

      expect(repo.updateDriverStatus).toHaveBeenCalledWith('driver-1', 'AVAILABLE');
    });

    it('should throw when delivery not found', async () => {
      repo.updateDeliveryStatus.mockResolvedValue(null);

      await expect(service.updateDeliveryStatus('nonexistent', 'PICKED_UP')).rejects.toThrow(
        'Delivery nonexistent not found',
      );
    });
  });

  describe('updateDriverStatus', () => {
    it('should update driver status and return driver', async () => {
      const driver = makeDriver({ status: 'OFFLINE' });
      repo.updateDriverStatus.mockResolvedValue(driver);
      repo.countAvailableDrivers.mockResolvedValue(2);

      const result = await service.updateDriverStatus('driver-1', 'OFFLINE');

      expect(repo.updateDriverStatus).toHaveBeenCalledWith('driver-1', 'OFFLINE', undefined);
      expect(result).toEqual(driver);
    });

    it('should pass location when provided', async () => {
      const driver = makeDriver();
      const location = { latitude: 19.4, longitude: -99.1 };
      repo.updateDriverStatus.mockResolvedValue(driver);
      repo.countAvailableDrivers.mockResolvedValue(3);

      await service.updateDriverStatus('driver-1', 'AVAILABLE', location);

      expect(repo.updateDriverStatus).toHaveBeenCalledWith('driver-1', 'AVAILABLE', location);
    });

    it('should throw when driver not found', async () => {
      repo.updateDriverStatus.mockResolvedValue(null);

      await expect(service.updateDriverStatus('nonexistent', 'AVAILABLE')).rejects.toThrow(
        'Driver nonexistent not found',
      );
    });
  });

  describe('getAvailableDrivers', () => {
    it('should return list of available drivers', async () => {
      const drivers = [makeDriver(), makeDriver({ id: 'driver-2', name: 'Jane Driver' })];
      repo.findAvailableDrivers.mockResolvedValue(drivers);

      const result = await service.getAvailableDrivers();

      expect(repo.findAvailableDrivers).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no drivers available', async () => {
      repo.findAvailableDrivers.mockResolvedValue([]);

      const result = await service.getAvailableDrivers();

      expect(result).toEqual([]);
    });
  });

  describe('getDeliveryById', () => {
    it('should return delivery when found', async () => {
      const delivery = makeDelivery();
      repo.findDeliveryById.mockResolvedValue(delivery);

      const result = await service.getDeliveryById('delivery-1');

      expect(result).toEqual(delivery);
    });

    it('should return null when not found', async () => {
      repo.findDeliveryById.mockResolvedValue(null);

      const result = await service.getDeliveryById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getDeliveries', () => {
    it('should return deliveries matching filters', async () => {
      const deliveries = [makeDelivery()];
      repo.findDeliveries.mockResolvedValue(deliveries);

      const result = await service.getDeliveries({ orderId: 'order-1' });

      expect(repo.findDeliveries).toHaveBeenCalledWith({ orderId: 'order-1' });
      expect(result).toEqual(deliveries);
    });
  });
});
