import { NotificationService, RedisPubClientLike } from '../../src/services/notification.service';
import { Pool } from 'pg';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/metrics/prometheus', () => ({
  notificationsSentTotal: { inc: jest.fn() },
  notificationsPending: { inc: jest.fn(), dec: jest.fn() },
  connectionStatus: { set: jest.fn() },
}));

const makeNotificationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'ORDER_CREATED',
  title: 'Pedido recibido',
  message: 'Tu pedido fue recibido',
  read: false,
  metadata: null,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPool: { query: jest.Mock };
  let mockPubClient: jest.Mocked<RedisPubClientLike>;

  beforeEach(() => {
    mockPool = { query: jest.fn() };
    mockPubClient = { publish: jest.fn().mockResolvedValue(1) };

    service = new NotificationService(mockPool as unknown as Pool, mockPubClient);
  });

  describe('createNotification', () => {
    it('should insert notification and return it', async () => {
      const row = makeNotificationRow();
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await service.createNotification('user-1', 'ORDER_CREATED', 'Pedido recibido', 'Tu pedido fue recibido');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['user-1', 'ORDER_CREATED', 'Pedido recibido', 'Tu pedido fue recibido']),
      );
      expect(result).toEqual(row);
    });

    it('should serialize metadata as JSON', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeNotificationRow()] });
      const metadata = { orderId: 'order-42' };

      await service.createNotification('user-1', 'ORDER_CREATED', 'title', 'msg', metadata);

      const call = mockPool.query.mock.calls[0];
      expect(call[1]).toContain(JSON.stringify(metadata));
    });

    it('should pass null metadata when none provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeNotificationRow()] });

      await service.createNotification('user-1', 'ORDER_CREATED', 'title', 'msg');

      const call = mockPool.query.mock.calls[0];
      expect(call[1]).toContain(null);
    });

    it('should publish to Redis PubSub channel', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeNotificationRow()] });

      await service.createNotification('user-1', 'ORDER_CREATED', 'title', 'msg');

      expect(mockPubClient.publish).toHaveBeenCalledWith(
        'notification:user-1',
        expect.any(String),
      );
    });

    it('should not throw when Redis publish fails', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeNotificationRow()] });
      mockPubClient.publish.mockRejectedValue(new Error('Redis down'));

      await expect(
        service.createNotification('user-1', 'ORDER_CREATED', 'title', 'msg'),
      ).resolves.not.toThrow();
    });

    it('should increment metrics', async () => {
      const { notificationsSentTotal, notificationsPending } =
        jest.requireMock('../../src/metrics/prometheus');
      mockPool.query.mockResolvedValue({ rows: [makeNotificationRow()] });

      await service.createNotification('user-1', 'ORDER_CREATED', 'title', 'msg');

      expect(notificationsSentTotal.inc).toHaveBeenCalledWith({ type: 'ORDER_CREATED' });
      expect(notificationsPending.inc).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('should query with userId, limit, and offset', async () => {
      const rows = [makeNotificationRow(), makeNotificationRow({ id: 'notif-2' })];
      mockPool.query.mockResolvedValue({ rows });

      const result = await service.getNotifications('user-1', 10, 0);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-1', 10, 0],
      );
      expect(result).toHaveLength(2);
    });

    it('should use default limit=20 and offset=0', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getNotifications('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['user-1', 20, 0]);
    });
  });

  describe('markRead', () => {
    it('should update read=true and return notification', async () => {
      const row = makeNotificationRow({ read: true });
      mockPool.query.mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await service.markRead('notif-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET read = true'),
        ['notif-1'],
      );
      expect(result.read).toBe(true);
    });

    it('should decrement pending metric on mark read', async () => {
      const { notificationsPending } = jest.requireMock('../../src/metrics/prometheus');
      mockPool.query.mockResolvedValue({ rows: [makeNotificationRow({ read: true })], rowCount: 1 });

      await service.markRead('notif-1');

      expect(notificationsPending.dec).toHaveBeenCalled();
    });

    it('should throw when notification not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(service.markRead('nonexistent')).rejects.toThrow(
        'Notification nonexistent not found',
      );
    });
  });

  describe('markAllRead', () => {
    it('should update all unread notifications for user', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 3 });

      const result = await service.markAllRead('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND read = false'),
        ['user-1'],
      );
      expect(result).toBe(true);
    });

    it('should decrement pending metric by count', async () => {
      const { notificationsPending } = jest.requireMock('../../src/metrics/prometheus');
      mockPool.query.mockResolvedValue({ rowCount: 5 });

      await service.markAllRead('user-1');

      expect(notificationsPending.dec).toHaveBeenCalledWith(5);
    });

    it('should not decrement when no rows updated', async () => {
      const { notificationsPending } = jest.requireMock('../../src/metrics/prometheus');
      jest.clearAllMocks();
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      await service.markAllRead('user-1');

      expect(notificationsPending.dec).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '7' }] });

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(7);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('read = false'),
        ['user-1'],
      );
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const prefs = {
        userId: 'user-1',
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        updatedAt: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [prefs], rowCount: 1 });

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(prefs);
    });

    it('should insert default preferences when none exist', async () => {
      const defaultPrefs = {
        userId: 'user-1',
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        updatedAt: new Date(),
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT
        .mockResolvedValueOnce({ rows: [defaultPrefs] }); // INSERT

      const result = await service.getPreferences('user-1');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual(defaultPrefs);
    });
  });

  describe('updatePreferences', () => {
    it('should upsert preferences and return result', async () => {
      const prefs = {
        userId: 'user-1',
        emailEnabled: false,
        smsEnabled: true,
        pushEnabled: true,
        updatedAt: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [prefs] });

      const result = await service.updatePreferences('user-1', {
        emailEnabled: false,
        smsEnabled: true,
        pushEnabled: true,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['user-1', false, true, true],
      );
      expect(result).toEqual(prefs);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when found', async () => {
      const row = makeNotificationRow();
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await service.getNotificationById('notif-1');

      expect(result).toEqual(row);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      expect(await service.getNotificationById('nonexistent')).toBeNull();
    });
  });
});
