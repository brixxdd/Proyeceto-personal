import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { RestaurantKafkaProducer } from '../events/kafka.producer';

export interface CreateRestaurantInput {
  name: string;
  description?: string;
  address: string;
  phone?: string;
  cuisineType: string;
  ownerId: string;
  rating?: number;
}

export interface UpdateRestaurantInput {
  id: string;
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  cuisineType?: string;
  isOpen?: boolean;
  rating?: number;
}

export interface CreateMenuItemInput {
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable?: boolean;
}

export interface UpdateMenuItemInput {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  isAvailable?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  cuisineType: string;
  ownerId: string;
  isOpen: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export class RestaurantService {
  private redis: RedisClientType;
  private cacheTTL: number;

  constructor(
    private pool: Pool,
    redisUrl: string,
    cacheTTL?: number,
    private kafkaProducer?: RestaurantKafkaProducer
  ) {
    this.redis = createClient({ url: redisUrl });
    this.redis.on('error', (err) => logger.error('Redis error', err));
    this.redis.on('connect', () => logger.info('Redis connected for caching'));
    this.cacheTTL = cacheTTL || 300;
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.warn('Failed to connect to Redis, continuing without cache', {
        error: (error as Error).message,
      });
    }
  }

  async getRestaurants(isOpen?: boolean): Promise<Restaurant[]> {
    const cacheKey = isOpen !== undefined ? `restaurants:open` : `restaurants:all`;

    // Try cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for restaurants');
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Cache read failed, falling back to DB');
    }

    // Query DB
    const query = isOpen !== undefined
      ? 'SELECT * FROM restaurants WHERE is_open = $1 ORDER BY rating DESC'
      : 'SELECT * FROM restaurants ORDER BY rating DESC';

    const params = isOpen !== undefined ? [isOpen] : [];
    const result = await this.pool.query(query, params);

    const restaurants = result.rows.map(this.mapRestaurant);

    // Cache result
    try {
      await this.redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(restaurants));
    } catch (error) {
      logger.warn('Cache write failed');
    }

    return restaurants;
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const cacheKey = `restaurant:${id}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for restaurant', { id });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Cache read failed, falling back to DB');
    }

    const result = await this.pool.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const restaurant = this.mapRestaurant(result.rows[0]);

    try {
      await this.redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(restaurant));
    } catch (error) {
      logger.warn('Cache write failed');
    }

    return restaurant;
  }

  async createRestaurant(input: CreateRestaurantInput): Promise<Restaurant> {
    const result = await this.pool.query(
      `INSERT INTO restaurants (name, description, address, phone, cuisine_type, owner_id, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [input.name, input.description || null, input.address, input.phone || null, input.cuisineType, input.ownerId, input.rating || 0.0]
    );

    const restaurant = this.mapRestaurant(result.rows[0]);

    // Invalidate cache
    await this.invalidateRestaurantsCache();

    logger.info('Restaurant created', { id: restaurant.id, name: restaurant.name });

    await this.kafkaProducer?.publishRestaurantCreated({
      restaurantId: restaurant.id,
      name: restaurant.name,
      ownerId: restaurant.ownerId,
      cuisineType: restaurant.cuisineType,
      timestamp: new Date().toISOString(),
    });

    return restaurant;
  }

  async updateRestaurant(input: UpdateRestaurantInput): Promise<Restaurant | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(input.address);
    }
    if (input.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(input.phone);
    }
    if (input.cuisineType !== undefined) {
      fields.push(`cuisine_type = $${paramCount++}`);
      values.push(input.cuisineType);
    }
    if (input.isOpen !== undefined) {
      fields.push(`is_open = $${paramCount++}`);
      values.push(input.isOpen);
    }
    if (input.rating !== undefined) {
      fields.push(`rating = $${paramCount++}`);
      values.push(input.rating);
    }

    if (fields.length === 0) {
      return this.getRestaurantById(input.id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(input.id);

    const result = await this.pool.query(
      `UPDATE restaurants SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    const restaurant = this.mapRestaurant(result.rows[0]);

    // Invalidate cache
    await this.invalidateRestaurantsCache();
    await this.redis.del(`restaurant:${input.id}`).catch(() => { });

    logger.info('Restaurant updated', { id: restaurant.id });

    return restaurant;
  }

  async deleteRestaurant(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM restaurants WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) return false;

    // Invalidate cache
    await this.invalidateRestaurantsCache();
    await this.redis.del(`restaurant:${id}`).catch(() => { });

    logger.info('Restaurant deleted', { id });

    return true;
  }

  async getMenu(restaurantId: string): Promise<MenuItem[]> {
    const cacheKey = `menu:${restaurantId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for menu', { restaurantId });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Cache read failed, falling back to DB');
    }

    const result = await this.pool.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name',
      [restaurantId]
    );

    const menu = result.rows.map(this.mapMenuItem);

    try {
      await this.redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(menu));
    } catch (error) {
      logger.warn('Cache write failed');
    }

    return menu;
  }

  async getMenuItemById(id: string): Promise<MenuItem | null> {
    const result = await this.pool.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    return this.mapMenuItem(result.rows[0]);
  }

  async getMenuItemsByIds(ids: string[]): Promise<MenuItem[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.pool.query(
      `SELECT * FROM menu_items WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows.map(this.mapMenuItem);
  }

  async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
    const result = await this.pool.query(
      `INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.restaurantId, input.name, input.description || null, input.price, input.category || null, input.isAvailable !== false]
    );

    const menuItem = this.mapMenuItem(result.rows[0]);

    // Invalidate menu cache
    await this.redis.del(`menu:${input.restaurantId}`).catch(() => { });

    logger.info('Menu item created', { id: menuItem.id, name: menuItem.name });

    await this.kafkaProducer?.publishMenuUpdated({
      restaurantId: input.restaurantId,
      action: 'created',
      menuItemId: menuItem.id,
      timestamp: new Date().toISOString(),
    });

    return menuItem;
  }

  async updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItem | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(input.price);
    }
    if (input.category !== undefined) {
      fields.push(`category = $${paramCount++}`);
      values.push(input.category);
    }
    if (input.isAvailable !== undefined) {
      fields.push(`is_available = $${paramCount++}`);
      values.push(input.isAvailable);
    }

    if (fields.length === 0) {
      return this.getMenuItemById(input.id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(input.id);

    const result = await this.pool.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    const menuItem = this.mapMenuItem(result.rows[0]);

    // Invalidate cache
    await this.redis.del(`menu:${menuItem.restaurantId}`).catch(() => { });

    logger.info('Menu item updated', { id: menuItem.id });

    await this.kafkaProducer?.publishMenuUpdated({
      restaurantId: menuItem.restaurantId,
      action: 'updated',
      menuItemId: menuItem.id,
      timestamp: new Date().toISOString(),
    });

    return menuItem;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const menuItem = await this.getMenuItemById(id);
    if (!menuItem) return false;

    await this.pool.query('DELETE FROM menu_items WHERE id = $1', [id]);

    // Invalidate cache
    await this.redis.del(`menu:${menuItem.restaurantId}`).catch(() => { });

    logger.info('Menu item deleted', { id });

    await this.kafkaProducer?.publishMenuUpdated({
      restaurantId: menuItem.restaurantId,
      action: 'deleted',
      menuItemId: id,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  private mapRestaurant(row: any): Restaurant {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      phone: row.phone,
      cuisineType: row.cuisine_type,
      ownerId: row.owner_id,
      isOpen: row.is_open,
      rating: row.rating,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
    };
  }

  private mapMenuItem(row: any): MenuItem {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      isAvailable: row.is_available,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
    };
  }

  private async invalidateRestaurantsCache(): Promise<void> {
    await this.redis.del('restaurants:all').catch(() => { });
    await this.redis.del('restaurants:open').catch(() => { });
  }
}
