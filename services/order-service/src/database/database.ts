import { Pool } from 'pg';
import { logger } from '../utils/logger';

export class Database {
  static async runMigrations(pool: Pool): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID NOT NULL,
          restaurant_id UUID NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          total_amount DECIMAL(10, 2) NOT NULL,
          delivery_address JSONB NOT NULL,
          delivery_person_id UUID,
          estimated_delivery_time INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // Create order_items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          menu_item_id UUID NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          subtotal DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)
      `);

      // Create function to update updated_at timestamp
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
        CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);

      await client.query('COMMIT');
      logger.info('Database migrations completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database migration failed', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

