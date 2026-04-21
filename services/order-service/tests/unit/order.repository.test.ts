import { OrderRepository } from '../../src/repositories/order.repository';
import { OrderStatus } from '../../src/models/order.model';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const makeItem = (overrides = {}) => ({
  id: 'item-1',
  menu_item_id: 'menu-1',
  quantity: 2,
  price: '9.99',
  subtotal: '19.98',
  ...overrides,
});

const makeOrderRow = (overrides = {}) => ({
  id: 'order-1',
  customer_id: 'customer-1',
  restaurant_id: 'restaurant-1',
  status: 'PENDING',
  total_amount: '29.97',
  delivery_address: JSON.stringify({ street: '123 Main', city: 'CDMX', state: 'CDMX', zipCode: '06600', country: 'MX' }),
  delivery_person_id: null,
  estimated_delivery_time: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  items: [makeItem()],
  ...overrides,
});

const makeClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

const makePool = (client: ReturnType<typeof makeClient>) => ({
  connect: jest.fn().mockResolvedValue(client),
  query: jest.fn(),
});

describe('OrderRepository', () => {
  let client: ReturnType<typeof makeClient>;
  let pool: ReturnType<typeof makePool>;
  let repo: OrderRepository;

  beforeEach(() => {
    client = makeClient();
    pool = makePool(client);
    repo = new OrderRepository(pool as any);
  });

  describe('createOrder', () => {
    it('creates order and items within transaction', async () => {
      const orderRow = makeOrderRow();
      const itemRow = makeItem();

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [orderRow] }) // INSERT order
        .mockResolvedValueOnce({ rows: [itemRow] }) // INSERT item
        .mockResolvedValueOnce(undefined); // COMMIT

      const input = {
        restaurantId: 'restaurant-1',
        items: [{ menuItemId: 'menu-1', quantity: 2, price: 9.99, subtotal: 19.98 }],
        deliveryAddress: { street: '123 Main', city: 'CDMX', state: 'CDMX', zipCode: '06600', country: 'MX' },
        totalAmount: 19.98,
      };

      const order = await repo.createOrder(input, 'customer-1');

      expect(order.id).toBe('order-1');
      expect(order.customerId).toBe('customer-1');
      expect(order.totalAmount).toBe(29.97);
      expect(order.items).toHaveLength(1);
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('rolls back on error', async () => {
      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT order fails

      await expect(
        repo.createOrder(
          { restaurantId: 'r1', items: [], deliveryAddress: {} as any, totalAmount: 0 },
          'customer-1'
        )
      ).rejects.toThrow('DB error');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns order when found', async () => {
      pool.query.mockResolvedValue({ rows: [makeOrderRow()] });
      const order = await repo.findById('order-1');
      expect(order?.id).toBe('order-1');
      expect(order?.status).toBe(OrderStatus.PENDING);
    });

    it('returns null when not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      expect(await repo.findById('missing')).toBeNull();
    });
  });

  describe('findByCustomerId', () => {
    it('returns orders for customer', async () => {
      pool.query.mockResolvedValue({ rows: [makeOrderRow()] });
      const orders = await repo.findByCustomerId('customer-1');
      expect(orders).toHaveLength(1);
      expect(orders[0].customerId).toBe('customer-1');
    });

    it('filters by status when provided', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      await repo.findByCustomerId('customer-1', OrderStatus.PENDING);
      const call = pool.query.mock.calls[0];
      expect(call[0]).toContain('AND o.status = $2');
      expect(call[1]).toContain(OrderStatus.PENDING);
    });

    it('returns empty array when no orders', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      expect(await repo.findByCustomerId('customer-1')).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns order', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [makeOrderRow({ status: 'CONFIRMED' })] })
        .mockResolvedValueOnce({ rows: [makeItem()] });

      const order = await repo.updateStatus('order-1', OrderStatus.CONFIRMED);
      expect(order?.status).toBe(OrderStatus.CONFIRMED);
    });

    it('includes deliveryPersonId when provided', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [makeOrderRow({ status: 'ASSIGNED', delivery_person_id: 'driver-1' })] })
        .mockResolvedValueOnce({ rows: [] });

      await repo.updateStatus('order-1', OrderStatus.ASSIGNED, 'driver-1');
      const updateCall = pool.query.mock.calls[0];
      expect(updateCall[0]).toContain('delivery_person_id = $3');
    });

    it('returns null when order not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      expect(await repo.updateStatus('missing', OrderStatus.CANCELLED)).toBeNull();
    });
  });
});
