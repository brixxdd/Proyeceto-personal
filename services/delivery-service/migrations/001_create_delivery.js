'use strict';

exports.up = function (pgm) {
  pgm.createTable('delivery_people', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'AVAILABLE',
    },
    current_location: {
      type: 'jsonb',
    },
    rating: {
      type: 'float',
      notNull: true,
      default: 5.0,
    },
    vehicle_type: {
      type: 'varchar(50)',
      notNull: true,
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

  pgm.createTable('deliveries', {
    id: {
      type: 'uuid',
      default: pgm.func('gen_random_uuid()'),
      primaryKey: true,
    },
    order_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
    },
    delivery_person_id: {
      type: 'uuid',
      references: '"delivery_people"',
      onDelete: 'SET NULL',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'PENDING',
    },
    pickup_time: {
      type: 'timestamp',
    },
    delivery_time: {
      type: 'timestamp',
    },
    current_location: {
      type: 'jsonb',
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

  pgm.createIndex('delivery_people', 'status');
  pgm.createIndex('deliveries', 'order_id');
  pgm.createIndex('deliveries', 'delivery_person_id');
  pgm.createIndex('deliveries', 'status');

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_delivery_people_updated_at ON delivery_people;
    CREATE TRIGGER update_delivery_people_updated_at
    BEFORE UPDATE ON delivery_people
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
    CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Seed 5 fake delivery people with AVAILABLE status for dev
  pgm.sql(`
    INSERT INTO delivery_people (id, name, status, current_location, rating, vehicle_type) VALUES
      (gen_random_uuid(), 'Carlos Mendoza', 'AVAILABLE', '{"latitude": 15.4915, "longitude": -92.2168}', 4.8, 'MOTORCYCLE'),
      (gen_random_uuid(), 'Ana López',     'AVAILABLE', '{"latitude": 15.4900, "longitude": -92.2150}', 4.9, 'BICYCLE'),
      (gen_random_uuid(), 'Roberto Cruz',  'AVAILABLE', '{"latitude": 15.4930, "longitude": -92.2180}', 4.7, 'CAR'),
      (gen_random_uuid(), 'María Torres',  'AVAILABLE', '{"latitude": 15.4880, "longitude": -92.2140}', 5.0, 'MOTORCYCLE'),
      (gen_random_uuid(), 'Juan Pérez',    'AVAILABLE', '{"latitude": 15.4950, "longitude": -92.2200}', 4.6, 'BICYCLE');
  `);
};

exports.down = function (pgm) {
  pgm.dropTable('deliveries', { cascade: true });
  pgm.dropTable('delivery_people', { cascade: true });
};
