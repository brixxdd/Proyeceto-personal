import { NotificationKafkaConsumer } from '../../src/events/kafka.consumer';
import { NotificationService } from '../../src/services/notification.service';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/metrics/prometheus', () => ({
  notificationsSentTotal: { inc: jest.fn() },
  notificationsPending: { inc: jest.fn(), dec: jest.fn() },
  connectionStatus: { set: jest.fn() },
}));

jest.mock('../../src/providers/email.provider', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/providers/sms.provider', () => ({
  sendSms: jest.fn().mockResolvedValue(undefined),
}));

// Mock kafkajs consumer so no real connections are made
const mockRun = jest.fn();
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

const mockProducerConnect = jest.fn().mockResolvedValue(undefined);
const mockProducerDisconnect = jest.fn().mockResolvedValue(undefined);
const mockProducerSend = jest.fn().mockResolvedValue(undefined);

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: mockConnect,
      subscribe: mockSubscribe,
      run: mockRun,
      disconnect: mockDisconnect,
    }),
    producer: jest.fn().mockReturnValue({
      connect: mockProducerConnect,
      disconnect: mockProducerDisconnect,
      send: mockProducerSend,
    }),
  })),
}));

const makeNotifRow = () => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'ORDER_CREATED',
  title: 'Pedido recibido',
  message: 'Tu pedido fue recibido',
  read: false,
  metadata: null,
  createdAt: new Date(),
});

describe('NotificationKafkaConsumer', () => {
  let kafkaConsumer: NotificationKafkaConsumer;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let handleMessage: (topic: string, data: unknown) => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue(makeNotifRow()),
    } as unknown as jest.Mocked<NotificationService>;

    // Capture the eachMessage handler via run mock
    mockRun.mockImplementation(async ({ eachMessage }) => {
      // Wrap it so tests can call handleMessage(topic, data)
      handleMessage = async (topic: string, data: unknown) => {
        await eachMessage({
          topic,
          partition: 0,
          message: { value: Buffer.from(JSON.stringify(data)) },
        });
      };
    });

    kafkaConsumer = new NotificationKafkaConsumer(mockNotificationService);
  });

  describe('connect', () => {
    it('should connect to Kafka', async () => {
      await kafkaConsumer.connect();

      expect(mockConnect).toHaveBeenCalled();
      expect(kafkaConsumer.isConnected()).toBe(true);
    });
  });

  describe('subscribe and message routing', () => {
    beforeEach(async () => {
      await kafkaConsumer.connect();
      await kafkaConsumer.subscribe();
    });

    it('should subscribe to all 5 topics', async () => {
      expect(mockSubscribe).toHaveBeenCalledTimes(5);
      const topics = mockSubscribe.mock.calls.map((c) => c[0].topic);
      expect(topics).toContain('order.created');
      expect(topics).toContain('order.assigned');
      expect(topics).toContain('order.delivered');
      expect(topics).toContain('order.cancelled');
      expect(topics).toContain('delivery.assigned');
    });

    it('should create ORDER_CREATED notification on order.created', async () => {
      await handleMessage('order.created', {
        orderId: 'order-1',
        customerId: 'user-1',
        restaurantId: 'rest-1',
        timestamp: '2026-01-01',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_CREATED',
        expect.any(String),
        expect.stringContaining('order-1'),
        expect.objectContaining({ orderId: 'order-1' }),
      );
    });

    it('should create ORDER_ASSIGNED notification on order.assigned', async () => {
      await handleMessage('order.assigned', {
        orderId: 'order-1',
        customerId: 'user-1',
        deliveryPersonId: 'driver-1',
        timestamp: '2026-01-01',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_ASSIGNED',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should create ORDER_DELIVERED notification on order.delivered', async () => {
      await handleMessage('order.delivered', {
        orderId: 'order-1',
        customerId: 'user-1',
        timestamp: '2026-01-01',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_DELIVERED',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should create ORDER_CANCELLED notification on order.cancelled', async () => {
      await handleMessage('order.cancelled', {
        orderId: 'order-1',
        customerId: 'user-1',
        timestamp: '2026-01-01',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_CANCELLED',
        expect.any(String),
        expect.stringContaining('order-1'),
        expect.any(Object),
      );
    });

    it('should notify deliveryPersonId on delivery.assigned', async () => {
      await handleMessage('delivery.assigned', {
        orderId: 'order-1',
        deliveryPersonId: 'driver-42',
        timestamp: '2026-01-01',
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        'driver-42',
        'DELIVERY_ASSIGNED',
        expect.any(String),
        expect.stringContaining('order-1'),
        expect.any(Object),
      );
    });

    it('should call sendEmail and sendSms on each event', async () => {
      const { sendEmail } = jest.requireMock('../../src/providers/email.provider');
      const { sendSms } = jest.requireMock('../../src/providers/sms.provider');

      await handleMessage('order.created', {
        orderId: 'order-1',
        customerId: 'user-1',
        restaurantId: 'rest-1',
        timestamp: '2026-01-01',
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(sendSms).toHaveBeenCalled();
    });

    it('should not throw when createNotification fails', async () => {
      jest.useFakeTimers();
      mockNotificationService.createNotification.mockRejectedValue(new Error('DB error'));

      const promise = handleMessage('order.created', {
        orderId: 'order-1',
        customerId: 'user-1',
        restaurantId: 'rest-1',
        timestamp: '2026-01-01',
      });
      jest.runAllTimersAsync();

      await expect(promise).resolves.not.toThrow();
      jest.useRealTimers();
    }, 15000);

    it('should skip message with null value', async () => {
      // Directly invoke eachMessage with null value
      const runCall = mockRun.mock.calls[0][0];
      await runCall.eachMessage({
        topic: 'order.created',
        partition: 0,
        message: { value: null },
      });

      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON without throwing', async () => {
      const runCall = mockRun.mock.calls[0][0];
      await expect(
        runCall.eachMessage({
          topic: 'order.created',
          partition: 0,
          message: { value: Buffer.from('not-json') },
        }),
      ).resolves.not.toThrow();
    });

    it('should log warning for unknown topic', async () => {
      const { logger } = jest.requireMock('../../src/utils/logger');

      await handleMessage('unknown.topic', { orderId: 'order-1' });

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and set connected=false', async () => {
      await kafkaConsumer.connect();
      await kafkaConsumer.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(kafkaConsumer.isConnected()).toBe(false);
    });
  });
});
