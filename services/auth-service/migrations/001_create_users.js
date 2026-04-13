'use strict';

exports.up = function(pgm) {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
    },
    role: {
      type: 'varchar(50)',
      notNull: true,
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

  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'role');

  pgm.addConstraint('users', 'valid_role', {
    check: "role IN ('CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PERSON', 'ADMIN')",
  });
};

exports.down = function(pgm) {
  pgm.dropTable('users', { cascade: true });
};
