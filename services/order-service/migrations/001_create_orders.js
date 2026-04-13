'use strict';

exports.up = function (pgm) {
  pgm.createTable('orders', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    customer_id: {
      type: 'uuid',
      notNull: true,
    },
    restaurant_id: {
      type: 'uuid',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'PENDING',
    },
    total_amount: {
      type: 'decimal(10,2)',
      notNull: true,
    },
    delivery_address: {
      type: 'jsonb',
      notNull: true,
    },
    delivery_person_id: {
      type: 'uuid',
    },
    estimated_delivery_time: {
      type: 'integer',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createTable('order_items', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    order_id: {
      type: 'uuid',
      notNull: true,
      references: '"orders"',
      onDelete: 'CASCADE',
    },
    menu_item_id: {
      type: 'uuid',
      notNull: true,
    },
    quantity: {
      type: 'integer',
      notNull: true,
    },
    price: {
      type: 'decimal(10,2)',
      notNull: true,
    },
    subtotal: {
      type: 'decimal(10,2)',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('orders', 'customer_id');
  pgm.createIndex('orders', 'restaurant_id');
  pgm.createIndex('orders', 'status');
  pgm.createIndex('order_items', 'order_id');

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
    CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = function (pgm) {
  pgm.dropTable('order_items', { cascade: true });
  pgm.dropTable('orders', { cascade: true });
};
