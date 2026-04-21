import { resolvers, initializeResolvers } from '../../src/resolvers';
import { RestaurantService } from '../../src/services/restaurant.service';

// Mock del servicio
const mockRestaurantService = {
  getRestaurants: jest.fn(),
  getRestaurantById: jest.fn(),
  getMenu: jest.fn(),
  getMenuItemById: jest.fn(),
  createRestaurant: jest.fn(),
  updateRestaurant: jest.fn(),
  deleteRestaurant: jest.fn(),
  createMenuItem: jest.fn(),
  updateMenuItem: jest.fn(),
  deleteMenuItem: jest.fn(),
  initialize: jest.fn(),
};

jest.mock('../../src/services/restaurant.service', () => ({
  RestaurantService: jest.fn().mockImplementation(() => mockRestaurantService),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Restaurant Resolvers', () => {
  const mockRestaurant = {
    id: 'rest-uuid-123',
    name: 'Test Restaurant',
    description: 'A test restaurant',
    address: '123 Test St',
    phone: '+1234567890',
    cuisineType: 'Italian',
    ownerId: 'owner-uuid-123',
    isOpen: true,
    rating: 4.5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockMenuItem = {
    id: 'menu-uuid-123',
    restaurantId: 'rest-uuid-123',
    name: 'Pizza Margherita',
    description: 'Classic pizza',
    price: 12.99,
    category: 'Main Course',
    isAvailable: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockContext = {
    user: { userId: 'owner-uuid-123', email: 'owner@test.com', role: 'RESTAURANT_OWNER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    initializeResolvers(mockRestaurantService as any);
  });

  describe('Query: restaurants', () => {
    it('should return all restaurants when no filter', async () => {
      mockRestaurantService.getRestaurants.mockResolvedValue([mockRestaurant]);

      const result = await resolvers.Query.restaurants(null!, {});

      expect(mockRestaurantService.getRestaurants).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockRestaurant]);
    });

    it('should filter by isOpen when provided', async () => {
      mockRestaurantService.getRestaurants.mockResolvedValue([mockRestaurant]);

      await resolvers.Query.restaurants(null!, { isOpen: true });

      expect(mockRestaurantService.getRestaurants).toHaveBeenCalledWith(true);
    });

    it('should return empty array when no restaurants', async () => {
      mockRestaurantService.getRestaurants.mockResolvedValue([]);

      const result = await resolvers.Query.restaurants(null!, {});

      expect(result).toEqual([]);
    });
  });

  describe('Query: restaurant', () => {
    it('should return restaurant when found', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);

      const result = await resolvers.Query.restaurant(null!, { id: 'rest-uuid-123' });

      expect(mockRestaurantService.getRestaurantById).toHaveBeenCalledWith('rest-uuid-123');
      expect(result).toEqual(mockRestaurant);
    });

    it('should throw error when restaurant not found', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(null);

      await expect(
        resolvers.Query.restaurant(null!, { id: 'non-existent' })
      ).rejects.toThrow('Restaurant not found');
    });
  });

  describe('Query: menu', () => {
    it('should return menu items for a restaurant', async () => {
      mockRestaurantService.getMenu.mockResolvedValue([mockMenuItem]);

      const result = await resolvers.Query.menu(null!, { restaurantId: 'rest-uuid-123' });

      expect(mockRestaurantService.getMenu).toHaveBeenCalledWith('rest-uuid-123');
      expect(result).toEqual([mockMenuItem]);
    });

    it('should return empty array when no menu items', async () => {
      mockRestaurantService.getMenu.mockResolvedValue([]);

      const result = await resolvers.Query.menu(null!, { restaurantId: 'rest-uuid-123' });

      expect(result).toEqual([]);
    });
  });

  describe('Query: menuItem', () => {
    it('should return menu item when found', async () => {
      mockRestaurantService.getMenuItemById.mockResolvedValue(mockMenuItem);

      const result = await resolvers.Query.menuItem(null!, { id: 'menu-uuid-123' });

      expect(mockRestaurantService.getMenuItemById).toHaveBeenCalledWith('menu-uuid-123');
      expect(result).toEqual(mockMenuItem);
    });

    it('should throw error when menu item not found', async () => {
      mockRestaurantService.getMenuItemById.mockResolvedValue(null);

      await expect(
        resolvers.Query.menuItem(null!, { id: 'non-existent' })
      ).rejects.toThrow('Menu item not found');
    });
  });

  describe('Mutation: createRestaurant', () => {
    const createArgs = {
      name: 'New Restaurant',
      description: 'A new restaurant',
      address: '456 New St',
      cuisineType: 'Mexican',
      phone: '+0987654321',
    };

    it('should create a restaurant and return it', async () => {
      mockRestaurantService.createRestaurant.mockResolvedValue(mockRestaurant);

      const result = await resolvers.Mutation.createRestaurant(null!, createArgs, mockContext);

      expect(mockRestaurantService.createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({ ...createArgs, ownerId: mockContext.user.userId })
      );
      expect(result).toEqual(mockRestaurant);
    });
  });

  describe('Mutation: updateRestaurant', () => {
    const updateArgs = {
      id: 'rest-uuid-123',
      name: 'Updated Name',
      isOpen: false,
    };

    it('should update a restaurant and return it', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);
      mockRestaurantService.updateRestaurant.mockResolvedValue({
        ...mockRestaurant,
        name: 'Updated Name',
        isOpen: false,
      });

      const result = await resolvers.Mutation.updateRestaurant(null!, updateArgs, mockContext);

      expect(mockRestaurantService.updateRestaurant).toHaveBeenCalledWith(updateArgs);
      expect(result).toHaveProperty('name', 'Updated Name');
    });

    it('should throw error when restaurant not found', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(null);

      await expect(
        resolvers.Mutation.updateRestaurant(null!, updateArgs, mockContext)
      ).rejects.toThrow('Restaurant not found');
    });
  });

  describe('Mutation: deleteRestaurant', () => {
    it('should delete a restaurant and return true', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);
      mockRestaurantService.deleteRestaurant.mockResolvedValue(true);

      const result = await resolvers.Mutation.deleteRestaurant(null!, { id: 'rest-uuid-123' }, mockContext);

      expect(mockRestaurantService.deleteRestaurant).toHaveBeenCalledWith('rest-uuid-123');
      expect(result).toBe(true);
    });

    it('should throw error when restaurant not found', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(null);

      await expect(
        resolvers.Mutation.deleteRestaurant(null!, { id: 'non-existent' }, mockContext)
      ).rejects.toThrow('Restaurant not found');
    });
  });

  describe('Mutation: createMenuItem', () => {
    const createArgs = {
      restaurantId: 'rest-uuid-123',
      name: 'New Pizza',
      description: 'A new pizza',
      price: 14.99,
      category: 'Main',
      isAvailable: true,
    };

    it('should create a menu item and return it', async () => {
      mockRestaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);
      mockRestaurantService.createMenuItem.mockResolvedValue(mockMenuItem);

      const result = await resolvers.Mutation.createMenuItem(null!, createArgs, mockContext);

      expect(mockRestaurantService.createMenuItem).toHaveBeenCalledWith(createArgs);
      expect(result).toEqual(mockMenuItem);
    });
  });

  describe('Mutation: updateMenuItem', () => {
    const updateArgs = {
      id: 'menu-uuid-123',
      name: 'Updated Pizza',
      price: 15.99,
    };

    it('should update a menu item and return it', async () => {
      mockRestaurantService.getMenuItemById.mockResolvedValue(mockMenuItem);
      mockRestaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);
      mockRestaurantService.updateMenuItem.mockResolvedValue({
        ...mockMenuItem,
        name: 'Updated Pizza',
        price: 15.99,
      });

      const result = await resolvers.Mutation.updateMenuItem(null!, updateArgs, mockContext);

      expect(mockRestaurantService.updateMenuItem).toHaveBeenCalledWith(updateArgs);
      expect(result).toHaveProperty('name', 'Updated Pizza');
    });

    it('should throw error when menu item not found', async () => {
      mockRestaurantService.getMenuItemById.mockResolvedValue(null);

      await expect(
        resolvers.Mutation.updateMenuItem(null!, updateArgs, mockContext)
      ).rejects.toThrow('Menu item not found');
    });
  });

  describe('Mutation: deleteMenuItem', () => {
    it('should delete a menu item and return true', async () => {
      mockRestaurantService.getMenuItemById.mockResolvedValue(mockMenuItem);
      mockRestaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);
      mockRestaurantService.deleteMenuItem.mockResolvedValue(true);

      const result = await resolvers.Mutation.deleteMenuItem(null!, { id: 'menu-uuid-123' }, mockContext);

      expect(mockRestaurantService.deleteMenuItem).toHaveBeenCalledWith('menu-uuid-123');
      expect(result).toBe(true);
    });

    it('should throw error when menu item not found', async () => {
      mockRestaurantService.getMenuItemById.mockResolvedValue(null);

      await expect(
        resolvers.Mutation.deleteMenuItem(null!, { id: 'non-existent' }, mockContext)
      ).rejects.toThrow('Menu item not found');
    });
  });

  describe('Subscription: restaurantStatusChanged', () => {
    it('should have a subscribe function defined', () => {
      const subscription = resolvers.Subscription.restaurantStatusChanged;

      expect(subscription).toHaveProperty('subscribe');
      expect(typeof subscription.subscribe).toBe('function');
    });

    it('should log a warning when subscription is called', () => {
      const { logger } = require('../../src/utils/logger');

      resolvers.Subscription.restaurantStatusChanged.subscribe();

      expect(logger.warn).toHaveBeenCalledWith('Subscription not implemented yet');
    });
  });
});
