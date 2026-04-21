import { KafkaConsumer } from '../../src/events/kafka.consumer';
import { DeliveryService } from '../../src/services/delivery.service';
import { Consumer } from 'kafkajs';
import { Delivery } from '../../src/models/delivery.model';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const makeDelivery = (): Delivery => ({
  id: 'delivery-1',
  orderId: 'order-1',
  deliveryPersonId: 'driver-1',
  status: 'ASSIGNED',
  pickupTime: null,
  deliveryTime: null,
  currentLocation: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

describe('KafkaConsumer (delivery-service)', () => {
  let consumer: KafkaConsumer;
  let mockKafkaConsumer: jest.Mocked<Consumer>;
  let mockDeliveryService: jest.Mocked<DeliveryService>;
  let eachMessageHandler: (payload: {
    topic: string;
    partition: number;
    message: { value: Buffer | null };
  }) => Promise<void>;

  beforeEach(() => {
    mockKafkaConsumer = {
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockImplementation(async ({ eachMessage }) => {
        eachMessageHandler = eachMessage;
      }),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Consumer>;

    mockDeliveryService = {
      assignDelivery: jest.fn().mockResolvedValue(makeDelivery()),
      cancelDelivery: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeliveryService>;

    consumer = new KafkaConsumer(mockKafkaConsumer, mockDeliveryService);
  });

  describe('start', () => {
    it('should subscribe to order.created and order.cancelled topics', async () => {
      await consumer.start();

      expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith({
        topics: ['order.created', 'order.cancelled'],
        fromBeginning: false,
      });
    });

    it('should call consumer.run', async () => {
      await consumer.start();

      expect(mockKafkaConsumer.run).toHaveBeenCalled();
    });
  });

  describe('message handling — order.created', () => {
    beforeEach(async () => {
      await consumer.start();
    });

    it('should call assignDelivery with orderId', async () => {
      const payload = { orderId: 'order-42', customerId: 'cust-1', timestamp: '2026-01-01' };

      await eachMessageHandler({
        topic: 'order.created',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(payload)) },
      });

      expect(mockDeliveryService.assignDelivery).toHaveBeenCalledWith('order-42');
    });

    it('should log warning when no driver available', async () => {
      mockDeliveryService.assignDelivery.mockResolvedValue(null);
      const { logger } = jest.requireMock('../../src/utils/logger');

      await eachMessageHandler({
        topic: 'order.created',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify({ orderId: 'order-99' })) },
      });

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('message handling — order.cancelled', () => {
    beforeEach(async () => {
      await consumer.start();
    });

    it('should call cancelDelivery with orderId', async () => {
      const payload = { orderId: 'order-42', timestamp: '2026-01-01' };

      await eachMessageHandler({
        topic: 'order.cancelled',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(payload)) },
      });

      expect(mockDeliveryService.cancelDelivery).toHaveBeenCalledWith('order-42');
    });
  });

  describe('message handling — edge cases', () => {
    beforeEach(async () => {
      await consumer.start();
    });

    it('should skip message with null value', async () => {
      await eachMessageHandler({
        topic: 'order.created',
        partition: 0,
        message: { value: null },
      });

      expect(mockDeliveryService.assignDelivery).not.toHaveBeenCalled();
    });

    it('should not throw when service throws', async () => {
      jest.useFakeTimers();
      mockDeliveryService.assignDelivery.mockRejectedValue(new Error('DB error'));

      const promise = eachMessageHandler({
        topic: 'order.created',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify({ orderId: 'order-1' })) },
      });
      jest.runAllTimersAsync();

      await expect(promise).resolves.not.toThrow();
      jest.useRealTimers();
    }, 15000);
  });

  describe('disconnect', () => {
    it('should call consumer.disconnect', async () => {
      await consumer.disconnect();

      expect(mockKafkaConsumer.disconnect).toHaveBeenCalled();
    });
  });
});
