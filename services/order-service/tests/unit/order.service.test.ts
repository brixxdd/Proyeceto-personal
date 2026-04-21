import { OrderService } from '../../src/services/order.service';
import { OrderRepository } from '../../src/repositories/order.repository';
import { KafkaProducer } from '../../src/events/kafka.producer';
import { RedisPubSub } from '../../src/pubsub/redis.pubsub';
import { Order, OrderStatus } from '../../src/models/order.model';
import * as restaurantClient from '../../src/clients/restaurant.client';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/clients/restaurant.client');

const makeAddress = () => ({
  street: '123 Main', city: 'CDMX', state: 'CDMX', zipCode: '06600', country: 'MX',
});

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  customerId: 'customer-1',
  restaurantId: 'restaurant-1',
  status: OrderStatus.PENDING,
  totalAmount: 19.98,
  deliveryAddress: makeAddress(),
  items: [{ id: 'oi-1', menuItemId: 'menu-1', quantity: 2, price: 9.99, subtotal: 19.98 }],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('OrderService', () => {
  let repo: jest.Mocked<OrderRepository>;
  let redis: { setEx: jest.Mock; get: jest.Mock };
  let kafka: jest.Mocked<KafkaProducer>;
  let pubSub: jest.Mocked<RedisPubSub>;
  let service: OrderService;

  beforeEach(() => {
    repo = {
      createOrder: jest.fn(),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    redis = { setEx: jest.fn().mockResolvedValue('OK'), get: jest.fn().mockResolvedValue(null) };

    kafka = {
      publishOrderCreated: jest.fn().mockResolvedValue(undefined),
      publishOrderAssigned: jest.fn().mockResolvedValue(undefined),
      publishOrderDelivered: jest.fn().mockResolvedValue(undefined),
    } as any;

    pubSub = { publish: jest.fn().mockResolvedValue(undefined) } as any;

    service = new OrderService(repo, redis as any, kafka, pubSub, 'http://restaurant:3001');
  });

  describe('createOrder', () => {
    it('validates prices, creates order, caches, and publishes event', async () => {
      const priceMap = new Map([['menu-1', { price: 9.99, isAvailable: true }]]);
      (restaurantClient.fetchMenuItemPrices as jest.Mock).mockResolvedValue(priceMap);
      repo.createOrder.mockResolvedValue(makeOrder());

      const input = {
        restaurantId: 'restaurant-1',
        items: [{ menuItemId: 'menu-1', quantity: 2 }],
        deliveryAddress: makeAddress(),
      };

      const order = await service.createOrder(input, 'customer-1');

      expect(restaurantClient.fetchMenuItemPrices).toHaveBeenCalledWith(['menu-1'], 'http://restaurant:3001');
      expect(repo.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 19.98 }),
        'customer-1'
      );
      expect(redis.setEx).toHaveBeenCalledWith('order:order-1', 3600, expect.any(String));
      expect(kafka.publishOrderCreated).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1' }));
      expect(order.id).toBe('order-1');
    });

    it('throws when restaurant client fails', async () => {
      (restaurantClient.fetchMenuItemPrices as jest.Mock).mockRejectedValue(new Error('Service down'));
      await expect(
        service.createOrder({ restaurantId: 'r1', items: [{ menuItemId: 'm1', quantity: 1 }], deliveryAddress: makeAddress() }, 'c1')
      ).rejects.toThrow('Service down');
      expect(repo.createOrder).not.toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('returns cached order without hitting DB', async () => {
      const order = makeOrder();
      redis.get.mockResolvedValue(JSON.stringify(order));

      const result = await service.getOrderById('order-1');
      expect(result?.id).toBe('order-1');
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it('fetches from DB on cache miss and caches result', async () => {
      redis.get.mockResolvedValue(null);
      repo.findById.mockResolvedValue(makeOrder());

      const result = await service.getOrderById('order-1');
      expect(repo.findById).toHaveBeenCalledWith('order-1');
      expect(redis.setEx).toHaveBeenCalled();
      expect(result?.id).toBe('order-1');
    });

    it('returns null when order not found', async () => {
      redis.get.mockResolvedValue(null);
      repo.findById.mockResolvedValue(null);
      expect(await service.getOrderById('missing')).toBeNull();
    });
  });

  describe('getOrders', () => {
    it('delegates to repository', async () => {
      repo.findByCustomerId.mockResolvedValue([makeOrder()]);
      const orders = await service.getOrders('customer-1', OrderStatus.PENDING, 10, 0);
      expect(repo.findByCustomerId).toHaveBeenCalledWith('customer-1', OrderStatus.PENDING, 10, 0);
      expect(orders).toHaveLength(1);
    });
  });

  describe('updateOrderStatus', () => {
    it('updates status, caches, and notifies subscribers', async () => {
      const updated = makeOrder({ status: OrderStatus.CONFIRMED });
      repo.updateStatus.mockResolvedValue(updated);

      const result = await service.updateOrderStatus('order-1', OrderStatus.CONFIRMED);
      expect(redis.setEx).toHaveBeenCalled();
      expect(pubSub.publish).toHaveBeenCalledWith(expect.any(String), updated);
      expect(result?.status).toBe(OrderStatus.CONFIRMED);
    });

    it('publishes order.assigned event when status is ASSIGNED', async () => {
      const updated = makeOrder({ status: OrderStatus.ASSIGNED, deliveryPersonId: 'driver-1' });
      repo.updateStatus.mockResolvedValue(updated);

      await service.updateOrderStatus('order-1', OrderStatus.ASSIGNED, 'driver-1');
      expect(kafka.publishOrderAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1', deliveryPersonId: 'driver-1' })
      );
    });

    it('publishes order.delivered event when status is DELIVERED', async () => {
      const updated = makeOrder({ status: OrderStatus.DELIVERED });
      repo.updateStatus.mockResolvedValue(updated);

      await service.updateOrderStatus('order-1', OrderStatus.DELIVERED);
      expect(kafka.publishOrderDelivered).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1' })
      );
    });

    it('returns null when order not found', async () => {
      repo.updateStatus.mockResolvedValue(null);
      expect(await service.updateOrderStatus('missing', OrderStatus.CONFIRMED)).toBeNull();
    });
  });

  describe('cancelOrder', () => {
    it('delegates to updateOrderStatus with CANCELLED', async () => {
      const updated = makeOrder({ status: OrderStatus.CANCELLED });
      repo.updateStatus.mockResolvedValue(updated);

      const result = await service.cancelOrder('order-1');
      expect(repo.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.CANCELLED, undefined);
      expect(result?.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
