import { Pool } from 'pg';
import { Order, OrderItem, OrderStatus, CreateOrderInput } from '../models/order.model';
import { logger } from '../utils/logger';

interface CreateOrderData extends CreateOrderInput {
  totalAmount: number;
}

export class OrderRepository {
  constructor(private pool: Pool) {}

  async createOrder(orderData: CreateOrderData, customerId: string): Promise<Order> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, restaurant_id, status, total_amount, delivery_address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          customerId,
          orderData.restaurantId,
          'PENDING',
          orderData.totalAmount,
          JSON.stringify(orderData.deliveryAddress),
        ]
      );

      const order = orderResult.rows[0];

      // Insert order items
      const items: OrderItem[] = [];
      for (const item of orderData.items) {
        const itemResult = await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            order.id,
            item.menuItemId,
            item.quantity,
            item.price,
            item.subtotal,
          ]
        );
        items.push(this.mapRowToOrderItem(itemResult.rows[0]));
      }

      await client.query('COMMIT');

      return this.mapRowToOrder(order, items);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating order', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Order | null> {
    const result = await this.pool.query(
      `SELECT o.*, 
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'menuItemId', oi.menu_item_id,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'subtotal', oi.subtotal
                )
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrder(result.rows[0], result.rows[0].items || []);
  }

  async findByCustomerId(customerId: string, status?: OrderStatus, limit = 20, offset = 0): Promise<Order[]> {
    let query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menuItemId', oi.menu_item_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'subtotal', oi.subtotal
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = $1
    `;
    
    const params: any[] = [customerId];
    
    if (status) {
      query += ` AND o.status = $2`;
      params.push(status);
      query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToOrder(row, row.items || []));
  }

  async findAllOrders(status?: OrderStatus, limit = 20, offset = 0): Promise<Order[]> {
    let query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menuItemId', oi.menu_item_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'subtotal', oi.subtotal
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE o.status = $1`;
      params.push(status);
      query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToOrder(row, row.items || []));
  }

  async updateStatus(id: string, status: OrderStatus, deliveryPersonId?: string): Promise<Order | null> {
    const updates: string[] = ['status = $2'];
    const values: any[] = [id, status];

    if (deliveryPersonId) {
      updates.push('delivery_person_id = $3');
      values.push(deliveryPersonId);
    }

    const result = await this.pool.query(
      `UPDATE orders 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];
    const itemsResult = await this.pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    return this.mapRowToOrder(order, itemsResult.rows.map(this.mapRowToOrderItem));
  }

  private mapRowToOrder(row: any, items: any[]): Order {
    return {
      id: row.id,
      customerId: row.customer_id,
      restaurantId: row.restaurant_id,
      status: row.status as OrderStatus,
      totalAmount: parseFloat(row.total_amount),
      deliveryAddress: typeof row.delivery_address === 'string' 
        ? JSON.parse(row.delivery_address) 
        : row.delivery_address,
      deliveryPersonId: row.delivery_person_id,
      estimatedDeliveryTime: row.estimated_delivery_time,
      items: Array.isArray(items) ? items.map(this.mapRowToOrderItem) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToOrderItem(row: any): OrderItem {
    return {
      id: row.id,
      menuItemId: row.menu_item_id || row.menuItemId,
      quantity: row.quantity,
      price: parseFloat(row.price),
      subtotal: parseFloat(row.subtotal),
    };
  }
}

