import { RestaurantService } from './services/restaurant.service';
import { logger } from './utils/logger';

let restaurantService: RestaurantService;

export function initializeResolvers(service: RestaurantService) {
  restaurantService = service;
}

export const resolvers = {
  Query: {
    restaurants: async (_parent: any, args: { isOpen?: boolean }) => {
      logger.debug('Query: restaurants', args);
      return restaurantService.getRestaurants(args.isOpen);
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
  },
  Mutation: {
    createRestaurant: async (_parent: any, args: any) => {
      logger.info('Mutation: createRestaurant', args);
      return restaurantService.createRestaurant(args);
    },
    updateRestaurant: async (_parent: any, args: any) => {
      logger.info('Mutation: updateRestaurant', args);
      const result = await restaurantService.updateRestaurant(args);
      if (!result) {
        throw new Error('Restaurant not found');
      }
      return result;
    },
    deleteRestaurant: async (_parent: any, args: { id: string }) => {
      logger.info('Mutation: deleteRestaurant', args);
      return restaurantService.deleteRestaurant(args.id);
    },
    createMenuItem: async (_parent: any, args: any) => {
      logger.info('Mutation: createMenuItem', args);
      return restaurantService.createMenuItem(args);
    },
    updateMenuItem: async (_parent: any, args: any) => {
      logger.info('Mutation: updateMenuItem', args);
      const result = await restaurantService.updateMenuItem(args);
      if (!result) {
        throw new Error('Menu item not found');
      }
      return result;
    },
    deleteMenuItem: async (_parent: any, args: { id: string }) => {
      logger.info('Mutation: deleteMenuItem', args);
      return restaurantService.deleteMenuItem(args.id);
    },
  },
  Subscription: {
    restaurantStatusChanged: {
      subscribe: () => {
        // TODO: Implement with PubSub or Redis
        logger.warn('Subscription not implemented yet');
        return { [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => ({ done: true, value: undefined })) }) };
      },
    },
  },
};
