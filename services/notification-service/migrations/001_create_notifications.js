'use strict';

exports.up = function(pgm) {
  pgm.createTable('notifications', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    user_id: {
      type: 'uuid',
      notNull: true,
    },
    type: {
      type: 'varchar(100)',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    message: {
      type: 'text',
      notNull: true,
    },
    read: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    metadata: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createTable('notification_preferences', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
    },
    email_enabled: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    sms_enabled: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    push_enabled: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('notifications', 'user_id');
  pgm.createIndex('notifications', 'read');
  pgm.createIndex('notifications', ['created_at'], { order: { created_at: 'DESC' } });
};

exports.down = function(pgm) {
  pgm.dropTable('notification_preferences', { cascade: true });
  pgm.dropTable('notifications', { cascade: true });
};
