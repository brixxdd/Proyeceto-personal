import { RestaurantService } from './services/restaurant.service';
import { logger } from './utils/logger';

interface UserContext {
  userId: string;
  email?: string;
  role?: string;
}

interface Context {
  user: UserContext | null;
}

let restaurantService: RestaurantService;

export function initializeResolvers(service: RestaurantService) {
  restaurantService = service;
}

function requireAuth(context: Context): UserContext {
  if (!context.user) {
    throw new Error('Not authenticated');
  }
  return context.user;
}

async function requireRestaurantOwner(restaurantId: string, user: UserContext): Promise<void> {
  if (user.role === 'ADMIN') return;

  const restaurant = await restaurantService.getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }
  if (restaurant.ownerId !== user.userId) {
    throw new Error('Not authorized: only the restaurant owner can perform this action');
  }
}

export const resolvers = {
  Query: {
    restaurants: async (_parent: any, args: { isOpen?: boolean }) => {
      logger.debug('Query: restaurants', args);
      return restaurantService.getRestaurants(args.isOpen);
    },
    myRestaurants: async (_parent: any, _args: any, context: Context) => {
      const user = requireAuth(context);
      logger.debug('Query: myRestaurants', { userId: user.userId });
      return restaurantService.getRestaurantsByOwner(user.userId);
    },
    restaurant: async (_parent: any, args: { id: string }) => {
      logger.debug('Query: restaurant', args);
      const restaurant = await restaurantService.getRestaurantById(args.id);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      return restaurant;
    },
    menu: async (_parent: any, args: { restaurantId: string }) => {
      logger.debug('Query: menu', args);
      return restaurantService.getMenu(args.restaurantId);
    },
    menuItem: async (_parent: any, args: { id: string }) => {
      logger.debug('Query: menuItem', args);
      const item = await restaurantService.getMenuItemById(args.id);
      if (!item) {
        throw new Error('Menu item not found');
      }
      return item;
    },
    menuItems: async (_parent: any, args: { ids: string[] }) => {
      logger.debug('Query: menuItems', args);
      return restaurantService.getMenuItemsByIds(args.ids);
    },
  },
  Mutation: {
    createRestaurant: async (_parent: any, args: any, context: Context) => {
      const user = requireAuth(context);
      if (user.role !== 'RESTAURANT_OWNER' && user.role !== 'ADMIN') {
        throw new Error('Not authorized: only restaurant owners can create restaurants');
      }
      logger.info('Mutation: createRestaurant', { userId: user.userId, args: args });
      // args.input contains { name, description, address, phone, email, cuisineType }
      // Force ownerId to authenticated user
      return restaurantService.createRestaurant({ ...args.input, ownerId: user.userId });
    },
    updateRestaurant: async (_parent: any, args: any, context: Context) => {
      const user = requireAuth(context);
      await requireRestaurantOwner(args.id, user);
      logger.info('Mutation: updateRestaurant', { id: args.id, userId: user.userId });
      const result = await restaurantService.updateRestaurant(args);
      if (!result) {
        throw new Error('Restaurant not found');
      }
      return result;
    },
    deleteRestaurant: async (_parent: any, args: { id: string }, context: Context) => {
      const user = requireAuth(context);
      await requireRestaurantOwner(args.id, user);
      logger.info('Mutation: deleteRestaurant', { id: args.id, userId: user.userId });
      return restaurantService.deleteRestaurant(args.id);
    },
    createMenuItem: async (_parent: any, args: any, context: Context) => {
      const user = requireAuth(context);
      await requireRestaurantOwner(args.restaurantId, user);
      logger.info('Mutation: createMenuItem', { restaurantId: args.restaurantId, userId: user.userId });
      return restaurantService.createMenuItem(args);
    },
    updateMenuItem: async (_parent: any, args: any, context: Context) => {
      const user = requireAuth(context);
      const item = await restaurantService.getMenuItemById(args.id);
      if (!item) throw new Error('Menu item not found');
      await requireRestaurantOwner(item.restaurantId, user);
      logger.info('Mutation: updateMenuItem', { id: args.id, userId: user.userId });
      const result = await restaurantService.updateMenuItem(args);
      if (!result) throw new Error('Menu item not found');
      return result;
    },
    deleteMenuItem: async (_parent: any, args: { id: string }, context: Context) => {
      const user = requireAuth(context);
      const item = await restaurantService.getMenuItemById(args.id);
      if (!item) throw new Error('Menu item not found');
      await requireRestaurantOwner(item.restaurantId, user);
      logger.info('Mutation: deleteMenuItem', { id: args.id, userId: user.userId });
      return restaurantService.deleteMenuItem(args.id);
    },
  },
  Subscription: {
    restaurantStatusChanged: {
      subscribe: () => {
        logger.warn('Subscription not implemented yet');
        return { [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => ({ done: true, value: undefined })) }) };
      },
    },
  },
};
