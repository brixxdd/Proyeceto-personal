'use strict';

exports.up = function(pgm) {
  pgm.createTable('restaurants', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    address: {
      type: 'varchar(500)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
    },
    cuisine_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    owner_id: {
      type: 'uuid',
      notNull: true,
    },
    is_open: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    rating: {
      type: 'float',
      default: 0.0,
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

  pgm.createIndex('restaurants', 'owner_id');
  pgm.createIndex('restaurants', 'cuisine_type');
  pgm.createIndex('restaurants', 'is_open');
};

exports.down = function(pgm) {
  pgm.dropTable('restaurants', { cascade: true });
};
