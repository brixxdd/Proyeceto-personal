import { IdempotencyService } from '../../src/services/idempotency.service';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const makeRedis = () => ({
  set: jest.fn(),
  get: jest.fn(),
});

describe('IdempotencyService', () => {
  let redis: ReturnType<typeof makeRedis>;
  let service: IdempotencyService;

  beforeEach(() => {
    redis = makeRedis();
    service = new IdempotencyService(redis as any);
  });

  describe('tryRecordEvent', () => {
    it('returns true and records new event', async () => {
      redis.set.mockResolvedValue('OK');
      const result = await service.tryRecordEvent('evt-1');
      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith('event:processed:evt-1', '1', { EX: 86400, NX: true });
    });

    it('returns false for duplicate event', async () => {
      redis.set.mockResolvedValue(null);
      const result = await service.tryRecordEvent('evt-1');
      expect(result).toBe(false);
    });

    it('returns true when Redis throws (fail-open)', async () => {
      redis.set.mockRejectedValue(new Error('Redis down'));
      const result = await service.tryRecordEvent('evt-1');
      expect(result).toBe(true);
    });
  });

  describe('isEventProcessed', () => {
    it('returns false when event not found', async () => {
      redis.get.mockResolvedValue(null);
      expect(await service.isEventProcessed('evt-1')).toBe(false);
    });

    it('returns true when event exists', async () => {
      redis.get.mockResolvedValue('1');
      expect(await service.isEventProcessed('evt-1')).toBe(true);
    });

    it('returns false when Redis throws', async () => {
      redis.get.mockRejectedValue(new Error('Redis down'));
      expect(await service.isEventProcessed('evt-1')).toBe(false);
    });
  });
});
