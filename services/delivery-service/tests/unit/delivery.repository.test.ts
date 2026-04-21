import { DeliveryRepository } from '../../src/repositories/delivery.repository';
import { Pool } from 'pg';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const makeDriverRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'driver-1',
  name: 'John Driver',
  status: 'AVAILABLE',
  current_location: null,
  rating: 4.8,
  vehicle_type: 'MOTORCYCLE',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...overrides,
});

const makeDeliveryRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'delivery-1',
  order_id: 'order-1',
  delivery_person_id: 'driver-1',
  status: 'ASSIGNED',
  pickup_time: null,
  delivery_time: null,
  current_location: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...overrides,
});

describe('DeliveryRepository', () => {
  let repo: DeliveryRepository;
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    mockPool = { query: jest.fn() };
    repo = new DeliveryRepository(mockPool as unknown as Pool);
  });

  describe('findDeliveryPersonById', () => {
    it('should return mapped driver when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDriverRow()] });

      const result = await repo.findDeliveryPersonById('driver-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM delivery_people WHERE id = $1',
        ['driver-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('driver-1');
      expect(result!.vehicleType).toBe('MOTORCYCLE');
      expect(result!.currentLocation).toBeNull();
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repo.findDeliveryPersonById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAvailableDriver', () => {
    it('should return single random available driver', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDriverRow()] });

      const result = await repo.findAvailableDriver();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'AVAILABLE'"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('RANDOM()'),
      );
      expect(result).not.toBeNull();
    });

    it('should return null when no available drivers', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repo.findAvailableDriver();

      expect(result).toBeNull();
    });
  });

  describe('findAvailableDrivers', () => {
    it('should return all available drivers sorted by rating', async () => {
      const rows = [makeDriverRow(), makeDriverRow({ id: 'driver-2', name: 'Jane' })];
      mockPool.query.mockResolvedValue({ rows });

      const result = await repo.findAvailableDrivers();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY rating DESC'),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('updateDriverStatus', () => {
    it('should update status and return updated driver', async () => {
      const updatedRow = makeDriverRow({ status: 'BUSY' });
      mockPool.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repo.updateDriverStatus('driver-1', 'BUSY');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delivery_people'),
        ['driver-1', 'BUSY', null],
      );
      expect(result!.status).toBe('BUSY');
    });

    it('should pass location as JSON when provided', async () => {
      const location = { latitude: 19.4, longitude: -99.1 };
      mockPool.query.mockResolvedValue({ rows: [makeDriverRow()] });

      await repo.updateDriverStatus('driver-1', 'AVAILABLE', location);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['driver-1', 'AVAILABLE', JSON.stringify(location)],
      );
    });

    it('should return null when driver not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repo.updateDriverStatus('nonexistent', 'BUSY');

      expect(result).toBeNull();
    });
  });

  describe('createDelivery', () => {
    it('should insert and return mapped delivery', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDeliveryRow()] });

      const result = await repo.createDelivery({
        orderId: 'order-1',
        deliveryPersonId: 'driver-1',
        status: 'ASSIGNED',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO deliveries'),
        ['order-1', 'driver-1', 'ASSIGNED'],
      );
      expect(result.orderId).toBe('order-1');
      expect(result.deliveryPersonId).toBe('driver-1');
    });
  });

  describe('findDeliveryById', () => {
    it('should return mapped delivery when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDeliveryRow()] });

      const result = await repo.findDeliveryById('delivery-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('delivery-1');
      expect(result!.status).toBe('ASSIGNED');
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      expect(await repo.findDeliveryById('nonexistent')).toBeNull();
    });
  });

  describe('findDeliveryByOrderId', () => {
    it('should return delivery for given order', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDeliveryRow()] });

      const result = await repo.findDeliveryByOrderId('order-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE order_id = $1',
        ['order-1'],
      );
      expect(result!.orderId).toBe('order-1');
    });

    it('should return null when no delivery for order', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      expect(await repo.findDeliveryByOrderId('nonexistent')).toBeNull();
    });
  });

  describe('findDeliveries', () => {
    it('should query with no WHERE when no filters', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDeliveryRow()] });

      await repo.findDeliveries({});

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [],
      );
    });

    it('should filter by orderId', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repo.findDeliveries({ orderId: 'order-1' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('order_id = $1'),
        ['order-1'],
      );
    });

    it('should filter by status', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repo.findDeliveries({ status: 'ASSIGNED' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['ASSIGNED'],
      );
    });

    it('should combine orderId and status filters', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repo.findDeliveries({ orderId: 'order-1', status: 'ASSIGNED' });

      const call = mockPool.query.mock.calls[0];
      expect(call[0]).toContain('order_id = $1');
      expect(call[0]).toContain('status = $2');
      expect(call[1]).toEqual(['order-1', 'ASSIGNED']);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update status and return delivery', async () => {
      const updated = makeDeliveryRow({ status: 'PICKED_UP' });
      mockPool.query.mockResolvedValue({ rows: [updated] });

      const result = await repo.updateDeliveryStatus('delivery-1', 'PICKED_UP');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE deliveries'),
        ['delivery-1', 'PICKED_UP'],
      );
      expect(result!.status).toBe('PICKED_UP');
    });

    it('should set pickup_time when status is PICKED_UP', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDeliveryRow({ status: 'PICKED_UP' })] });

      await repo.updateDeliveryStatus('delivery-1', 'PICKED_UP');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('pickup_time = NOW()'),
        expect.any(Array),
      );
    });

    it('should set delivery_time when status is DELIVERED', async () => {
      mockPool.query.mockResolvedValue({ rows: [makeDeliveryRow({ status: 'DELIVERED' })] });

      await repo.updateDeliveryStatus('delivery-1', 'DELIVERED');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('delivery_time = NOW()'),
        expect.any(Array),
      );
    });

    it('should return null when delivery not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      expect(await repo.updateDeliveryStatus('nonexistent', 'CANCELLED')).toBeNull();
    });
  });

  describe('countActiveDeliveries', () => {
    it('should return count of non-terminal deliveries', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '3' }] });

      const count = await repo.countActiveDeliveries();

      expect(count).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("NOT IN ('DELIVERED', 'CANCELLED')"),
      );
    });
  });

  describe('countAvailableDrivers', () => {
    it('should return count of available drivers', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const count = await repo.countAvailableDrivers();

      expect(count).toBe(5);
    });
  });
});
