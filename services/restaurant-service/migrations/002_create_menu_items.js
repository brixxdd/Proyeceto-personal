'use strict';

exports.up = function(pgm) {
  pgm.createTable('menu_items', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    restaurant_id: {
      type: 'uuid',
      notNull: true,
      references: '"restaurants"',
      onDelete: 'cascade',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    price: {
      type: 'numeric(10, 2)',
      notNull: true,
    },
    category: {
      type: 'varchar(100)',
    },
    is_available: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('menu_items', 'restaurant_id');
  pgm.createIndex('menu_items', 'category');
  pgm.createIndex('menu_items', 'is_available');
};

exports.down = function(pgm) {
  pgm.dropTable('menu_items', { cascade: true });
};
