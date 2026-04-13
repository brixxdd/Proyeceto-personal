import { Pool } from 'pg';
import { createClient } from 'redis';
import {
  RestaurantService,
  CreateRestaurantInput,
  UpdateRestaurantInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from '../../src/services/restaurant.service';

// Mock de Redis
const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(0),
  ping: jest.fn().mockResolvedValue('PONG'),
  on: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis),
}));

// Mock de logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RestaurantService', () => {
  let service: RestaurantService;
  let mockPool: any;

  const mockRestaurantRow = {
    id: 'rest-uuid-123',
    name: 'Test Restaurant',
    description: 'A test restaurant',
    address: '123 Test St',
    phone: '+1234567890',
    cuisine_type: 'Italian',
    owner_id: 'owner-uuid-123',
    is_open: true,
    rating: 4.5,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockMenuItemRow = {
    id: 'menu-uuid-123',
    restaurant_id: 'rest-uuid-123',
    name: 'Pizza Margherita',
    description: 'Classic pizza',
    price: '12.99',
    category: 'Main Course',
    is_available: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const createRestaurantInput: CreateRestaurantInput = {
    name: 'Test Restaurant',
    description: 'A test restaurant',
    address: '123 Test St',
    phone: '+1234567890',
    cuisineType: 'Italian',
    ownerId: 'owner-uuid-123',
  };

  const createMenuItemInput: CreateMenuItemInput = {
    restaurantId: 'rest-uuid-123',
    name: 'Pizza Margherita',
    description: 'Classic pizza',
    price: 12.99,
    category: 'Main Course',
    isAvailable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn(),
    };

    // Mock Redis connect
    mockRedis.connect.mockResolvedValue(undefined);
    mockRedis.get.mockRejectedValue(new Error('Cache miss'));
    mockRedis.setEx.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(0);

    service = new RestaurantService(mockPool, 'redis://localhost:6379', 300);
  });

  describe('initialize', () => {
    it('should connect to Redis successfully', async () => {
      mockRedis.connect.mockResolvedValue(undefined);

      await service.initialize();

      expect(mockRedis.connect).toHaveBeenCalled();
    });

    it('should handle Redis connection failure gracefully', async () => {
      mockRedis.connect.mockRejectedValue(new Error('Connection refused'));

      // Should not throw
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('getRestaurants', () => {
    it('should return all restaurants when no filter is provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      const result = await service.getRestaurants();

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM restaurants ORDER BY rating DESC',
        []
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'rest-uuid-123',
        name: 'Test Restaurant',
        description: 'A test restaurant',
        address: '123 Test St',
        phone: '+1234567890',
        cuisineType: 'Italian',
        ownerId: 'owner-uuid-123',
        isOpen: true,
        rating: 4.5,
        createdAt: mockRestaurantRow.created_at.toISOString(),
        updatedAt: mockRestaurantRow.updated_at.toISOString(),
      });
    });

    it('should filter by isOpen when provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      await service.getRestaurants(true);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE is_open = $1 ORDER BY rating DESC',
        [true]
      );
    });

    it('should return cached results when available', async () => {
      const cachedData = [{
        id: 'rest-uuid-123',
        name: 'Cached Restaurant',
        description: 'Cached',
        address: '456 Cache St',
        phone: null,
        cuisineType: 'Mexican',
        ownerId: 'owner-uuid',
        isOpen: true,
        rating: 4.0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getRestaurants();

      expect(mockRedis.get).toHaveBeenCalledWith('restaurants:all');
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should cache results after querying database', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      await service.getRestaurants();

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'restaurants:all',
        300,
        expect.any(String)
      );
    });

    it('should fall back to DB when cache read fails', async () => {
      mockRedis.get.mockRejectedValue(new Error('Cache error'));
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      const result = await service.getRestaurants();

      expect(result).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('getRestaurantById', () => {
    it('should return restaurant when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      const result = await service.getRestaurantById('rest-uuid-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM restaurants WHERE id = $1',
        ['rest-uuid-123']
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Restaurant');
    });

    it('should return null when restaurant not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getRestaurantById('non-existent');

      expect(result).toBeNull();
    });

    it('should return cached restaurant when available', async () => {
      const cached = {
        id: 'rest-uuid-123',
        name: 'Cached Restaurant',
        description: 'Cached',
        address: '456 Cache St',
        phone: null,
        cuisineType: 'Mexican',
        ownerId: 'owner-uuid',
        isOpen: true,
        rating: 4.0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getRestaurantById('rest-uuid-123');

      expect(mockRedis.get).toHaveBeenCalledWith('restaurant:rest-uuid-123');
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('should cache restaurant after querying database', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      await service.getRestaurantById('rest-uuid-123');

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'restaurant:rest-uuid-123',
        300,
        expect.any(String)
      );
    });
  });

  describe('createRestaurant', () => {
    it('should create a restaurant successfully', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      const result = await service.createRestaurant(createRestaurantInput);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO restaurants'),
        expect.arrayContaining([
          'Test Restaurant',
          'A test restaurant',
          '123 Test St',
          '+1234567890',
          'Italian',
          'owner-uuid-123',
          0.0,
        ])
      );
      expect(mockRedis.del).toHaveBeenCalledWith('restaurants:all');
      expect(mockRedis.del).toHaveBeenCalledWith('restaurants:open');
      expect(result.name).toBe('Test Restaurant');
    });

    it('should handle null description correctly', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });
      const inputWithoutDesc = { ...createRestaurantInput, description: undefined };

      await service.createRestaurant(inputWithoutDesc);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO restaurants'),
        expect.arrayContaining([null])
      );
    });

    it('should handle null phone correctly', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });
      const inputWithoutPhone = { ...createRestaurantInput, phone: undefined };

      await service.createRestaurant(inputWithoutPhone);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO restaurants'),
        expect.arrayContaining([null])
      );
    });
  });

  describe('updateRestaurant', () => {
    it('should update restaurant successfully', async () => {
      const updateInput: UpdateRestaurantInput = {
        id: 'rest-uuid-123',
        name: 'Updated Name',
        isOpen: false,
      };
      mockPool.query.mockResolvedValue({ rows: [{ ...mockRestaurantRow, name: 'Updated Name', is_open: false }] });

      const result = await service.updateRestaurant(updateInput);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE restaurants SET'),
        expect.arrayContaining(['Updated Name', false, 'rest-uuid-123'])
      );
      expect(mockRedis.del).toHaveBeenCalledWith('restaurants:all');
      expect(mockRedis.del).toHaveBeenCalledWith('restaurants:open');
      expect(mockRedis.del).toHaveBeenCalledWith('restaurant:rest-uuid-123');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Name');
    });

    it('should return null when restaurant not found', async () => {
      const updateInput: UpdateRestaurantInput = {
        id: 'non-existent',
        name: 'Updated Name',
      };
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.updateRestaurant(updateInput);

      expect(result).toBeNull();
    });

    it('should return current state when no fields provided', async () => {
      // When no fields to update, it should call getRestaurantById
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      const result = await service.updateRestaurant({ id: 'rest-uuid-123' });

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rest-uuid-123');
    });

    it('should update only specified fields', async () => {
      const updateInput: UpdateRestaurantInput = {
        id: 'rest-uuid-123',
        rating: 4.8,
      };
      mockPool.query.mockResolvedValue({ rows: [{ ...mockRestaurantRow, rating: 4.8 }] });

      await service.updateRestaurant(updateInput);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('rating = $1'),
        expect.arrayContaining([4.8, 'rest-uuid-123'])
      );
    });
  });

  describe('deleteRestaurant', () => {
    it('should delete restaurant successfully', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await service.deleteRestaurant('rest-uuid-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM restaurants WHERE id = $1',
        ['rest-uuid-123']
      );
      expect(mockRedis.del).toHaveBeenCalledWith('restaurants:all');
      expect(mockRedis.del).toHaveBeenCalledWith('restaurants:open');
      expect(mockRedis.del).toHaveBeenCalledWith('restaurant:rest-uuid-123');
      expect(result).toBe(true);
    });

    it('should return false when restaurant not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await service.deleteRestaurant('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getMenu', () => {
    it('should return menu items for a restaurant', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      const result = await service.getMenu('rest-uuid-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name',
        ['rest-uuid-123']
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pizza Margherita');
      expect(result[0].price).toBe(12.99);
    });

    it('should return cached menu when available', async () => {
      const cached = [{
        id: 'menu-uuid-123',
        restaurantId: 'rest-uuid-123',
        name: 'Cached Pizza',
        description: 'Cached',
        price: 15.99,
        category: 'Main',
        isAvailable: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }];

      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getMenu('rest-uuid-123');

      expect(mockRedis.get).toHaveBeenCalledWith('menu:rest-uuid-123');
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('should return empty array when no menu items', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getMenu('rest-uuid-123');

      expect(result).toEqual([]);
    });

    it('should cache menu after querying database', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      await service.getMenu('rest-uuid-123');

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'menu:rest-uuid-123',
        300,
        expect.any(String)
      );
    });
  });

  describe('getMenuItemById', () => {
    it('should return menu item when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      const result = await service.getMenuItemById('menu-uuid-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM menu_items WHERE id = $1',
        ['menu-uuid-123']
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Pizza Margherita');
    });

    it('should return null when menu item not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getMenuItemById('non-existent');

      expect(result).toBeNull();
    });

    it('should parse price as float', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      const result = await service.getMenuItemById('menu-uuid-123');

      expect(result!.price).toBe(12.99);
      expect(typeof result!.price).toBe('number');
    });
  });

  describe('createMenuItem', () => {
    it('should create a menu item successfully', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      const result = await service.createMenuItem(createMenuItemInput);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([
          'rest-uuid-123',
          'Pizza Margherita',
          'Classic pizza',
          12.99,
          'Main Course',
          true,
        ])
      );
      expect(mockRedis.del).toHaveBeenCalledWith('menu:rest-uuid-123');
      expect(result.name).toBe('Pizza Margherita');
    });

    it('should default isAvailable to true when not specified', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });
      const input = { ...createMenuItemInput, isAvailable: undefined };

      await service.createMenuItem(input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([true])
      );
    });

    it('should set isAvailable to false when explicitly false', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });
      const input = { ...createMenuItemInput, isAvailable: false };

      await service.createMenuItem(input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([false])
      );
    });

    it('should handle null description and category', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });
      const input = {
        ...createMenuItemInput,
        description: undefined,
        category: undefined,
      };

      await service.createMenuItem(input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_items'),
        expect.arrayContaining([null])
      );
    });
  });

  describe('updateMenuItem', () => {
    it('should update menu item successfully', async () => {
      const updateInput: UpdateMenuItemInput = {
        id: 'menu-uuid-123',
        name: 'Updated Pizza',
        price: 14.99,
      };
      mockPool.query.mockResolvedValue({ rows: [{ ...mockMenuItemRow, name: 'Updated Pizza', price: '14.99' }] });

      const result = await service.updateMenuItem(updateInput);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET'),
        expect.arrayContaining(['Updated Pizza', 14.99, 'menu-uuid-123'])
      );
      expect(mockRedis.del).toHaveBeenCalledWith('menu:rest-uuid-123');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Pizza');
    });

    it('should return null when menu item not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.updateMenuItem({ id: 'non-existent', name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should return current state when no fields provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      const result = await service.updateMenuItem({ id: 'menu-uuid-123' });

      expect(result).not.toBeNull();
      expect(result!.id).toBe('menu-uuid-123');
    });

    it('should update isAvailable field', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ ...mockMenuItemRow, is_available: false }] });

      await service.updateMenuItem({ id: 'menu-uuid-123', isAvailable: false });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_available = $1'),
        expect.arrayContaining([false, 'menu-uuid-123'])
      );
    });
  });

  describe('deleteMenuItem', () => {
    it('should delete menu item successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMenuItemRow] }) // getMenuItemById
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      const result = await service.deleteMenuItem('menu-uuid-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM menu_items WHERE id = $1',
        ['menu-uuid-123']
      );
      expect(mockRedis.del).toHaveBeenCalledWith('menu:rest-uuid-123');
      expect(result).toBe(true);
    });

    it('should return false when menu item not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.deleteMenuItem('non-existent');

      expect(result).toBe(false);
      expect(mockPool.query).not.toHaveBeenCalledWith(
        'DELETE FROM menu_items WHERE id = $1',
        expect.any(Array)
      );
    });
  });

  describe('mapRestaurant and mapMenuItem private methods', () => {
    it('should map restaurant row with correct camelCase fields', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockRestaurantRow] });

      const result = await service.getRestaurantById('rest-uuid-123');

      expect(result).toHaveProperty('cuisineType', 'Italian');
      expect(result).toHaveProperty('ownerId', 'owner-uuid-123');
      expect(result).toHaveProperty('isOpen', true);
      expect(result).toHaveProperty('createdAt', mockRestaurantRow.created_at.toISOString());
      expect(result).toHaveProperty('updatedAt', mockRestaurantRow.updated_at.toISOString());
    });

    it('should map menu item row with correct camelCase fields', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockMenuItemRow] });

      const result = await service.getMenuItemById('menu-uuid-123');

      expect(result).toHaveProperty('restaurantId', 'rest-uuid-123');
      expect(result).toHaveProperty('isAvailable', true);
      expect(result).toHaveProperty('createdAt', mockMenuItemRow.created_at.toISOString());
      expect(result).toHaveProperty('updatedAt', mockMenuItemRow.updated_at.toISOString());
    });

    it('should handle null created_at/updated_at gracefully', async () => {
      const rowWithoutDates = { ...mockRestaurantRow, created_at: null, updated_at: null };
      mockPool.query.mockResolvedValue({ rows: [rowWithoutDates] });

      const result = await service.getRestaurantById('rest-uuid-123');

      expect(result).not.toBeNull();
      expect(result!.createdAt).toBeUndefined();
      expect(result!.updatedAt).toBeUndefined();
    });
  });
});
