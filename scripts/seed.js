'use strict';

/**
 * Seed script for the food delivery platform.
 * Inserts realistic test data into auth_db, restaurant_db, order_db and delivery_db.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires bcryptjs and pg to be installed. The script resolves them from the
 * auth-service node_modules directory if they are not available globally.
 */

const path = require('path');

// Resolve bcryptjs and pg from auth-service node_modules when not installed globally.
let bcrypt, pg;
try {
  bcrypt = require('bcryptjs');
} catch (_) {
  bcrypt = require(path.resolve(__dirname, '../services/auth-service/node_modules/bcryptjs'));
}
try {
  pg = require('pg');
} catch (_) {
  pg = require(path.resolve(__dirname, '../services/auth-service/node_modules/pg'));
}

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Connection strings
// ---------------------------------------------------------------------------
const AUTH_DB_URL =
  process.env.AUTH_DB_URL || 'postgresql://postgres:postgres@localhost:5433/auth_db';
const RESTAURANT_DB_URL =
  process.env.RESTAURANT_DB_URL || 'postgresql://postgres:postgres@localhost:5434/restaurant_db';
const ORDER_DB_URL =
  process.env.ORDER_DB_URL || 'postgresql://postgres:postgres@localhost:5435/order_db';
const DELIVERY_DB_URL =
  process.env.DELIVERY_DB_URL || 'postgresql://postgres:postgres@localhost:5436/delivery_db';

// ---------------------------------------------------------------------------
// Hardcoded UUIDs — keep stable so the script stays idempotent
// ---------------------------------------------------------------------------
const IDS = {
  // Users
  adminUser:     'a0000000-0000-0000-0000-000000000001',
  owner1:        'a0000000-0000-0000-0000-000000000002',
  owner2:        'a0000000-0000-0000-0000-000000000003',
  customer1:     'a0000000-0000-0000-0000-000000000004',
  customer2:     'a0000000-0000-0000-0000-000000000005',
  driver1:       'a0000000-0000-0000-0000-000000000006',
  driver2:       'a0000000-0000-0000-0000-000000000007',

  // Restaurants
  tacosElGuero:  'b0000000-0000-0000-0000-000000000001',
  sushiNagoya:   'b0000000-0000-0000-0000-000000000002',
  pizzaRoma:     'b0000000-0000-0000-0000-000000000003',

  // Menu items — Tacos El Güero
  tacoPastor:    'c0000000-0000-0000-0000-000000000001',
  tacoBistec:   'c0000000-0000-0000-0000-000000000002',
  quesadilla:   'c0000000-0000-0000-0000-000000000003',
  horchata:     'c0000000-0000-0000-0000-000000000004',

  // Menu items — Sushi Nagoya
  californiaRoll: 'c0000000-0000-0000-0000-000000000005',
  sashimiSalmon:  'c0000000-0000-0000-0000-000000000006',
  ramenTonkotsu:  'c0000000-0000-0000-0000-000000000007',
  edamame:        'c0000000-0000-0000-0000-000000000008',

  // Menu items — Pizza Roma
  pizzaMargherita: 'c0000000-0000-0000-0000-000000000009',
  pizzaPepperoni:  'c0000000-0000-0000-0000-000000000010',
  pastaCarbonara:  'c0000000-0000-0000-0000-000000000011',
  tiramisu:        'c0000000-0000-0000-0000-000000000012',

  // Delivery people
  deliveryPerson1: 'd0000000-0000-0000-0000-000000000001',
  deliveryPerson2: 'd0000000-0000-0000-0000-000000000002',
  deliveryPerson3: 'd0000000-0000-0000-0000-000000000003',
  deliveryPerson4: 'd0000000-0000-0000-0000-000000000004',

  // Orders (one per restaurant + status variety)
  order1: 'e0000000-0000-0000-0000-000000000001', // READY — waiting for driver
  order2: 'e0000000-0000-0000-0000-000000000002', // DELIVERED
  order3: 'e0000000-0000-0000-0000-000000000003', // CONFIRMED
  order4: 'e0000000-0000-0000-0000-000000000004', // PREPARING
  order5: 'e0000000-0000-0000-0000-000000000005', // PENDING
};

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 10);
}

async function seedUsers(pool) {
  const [adminHash, ownerHash, customerHash, driverHash] = await Promise.all([
    hashPassword('Admin123!'),
    hashPassword('Owner123!'),
    hashPassword('Customer123!'),
    hashPassword('Driver123!'),
  ]);

  const users = [
    { id: IDS.adminUser,    email: 'admin@fooddelivery.com',    password_hash: adminHash,   name: 'Admin User',        phone: '+52 961 000 0000', role: 'ADMIN' },
    { id: IDS.owner1,      email: 'owner1@test.com',            password_hash: ownerHash,    name: 'Carlos Gutiérrez',   phone: '+52 961 111 1111', role: 'RESTAURANT_OWNER' },
    { id: IDS.owner2,       email: 'owner2@test.com',            password_hash: ownerHash,    name: 'Yuki Tanaka',        phone: '+52 961 222 2222', role: 'RESTAURANT_OWNER' },
    { id: IDS.customer1,    email: 'customer1@test.com',         password_hash: customerHash, name: 'María López',       phone: '+52 961 333 3333', role: 'CUSTOMER' },
    { id: IDS.customer2,    email: 'customer2@test.com',         password_hash: customerHash, name: 'Juan Pérez',         phone: '+52 961 444 4444', role: 'CUSTOMER' },
    { id: IDS.driver1,     email: 'driver1@test.com',           password_hash: driverHash,   name: 'Carlos Mendoza',    phone: '+52 961 555 5555', role: 'DELIVERY_PERSON' },
    { id: IDS.driver2,     email: 'driver2@test.com',           password_hash: driverHash,   name: 'Ana López',          phone: '+52 961 666 6666', role: 'DELIVERY_PERSON' },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [u.id, u.email, u.password_hash, u.name, u.phone, u.role]
    );
  }

  console.log('  ✓ Seeded users (' + users.length + ' rows)');
}

async function seedRestaurants(pool) {
  const restaurants = [
    { id: IDS.tacosElGuero, name: 'Tacos El Güero',    description: 'Los mejores tacos al pastor de Tapachula, con salsas artesanales y tortillas hechas a mano.', address: 'Calle Central Nte. 12, Col. Centro, Tapachula, Chiapas, C.P. 30700', phone: '+52 962 625 0001', cuisine_type: 'Mexican',  owner_id: IDS.owner1, is_open: true,  rating: 4.5 },
    { id: IDS.sushiNagoya,  name: 'Sushi Nagoya',       description: 'Auténtica cocina japonesa con ingredientes frescos importados. Sushi, ramen y más.',        address: 'Av. Central Poniente 45, Col. Ferrocarrilera, Tapachula, Chiapas, C.P. 30710', phone: '+52 962 625 0002', cuisine_type: 'Japanese', owner_id: IDS.owner2, is_open: true,  rating: 4.8 },
    { id: IDS.pizzaRoma,    name: 'Pizza Roma',         description: 'Pizzas al horno de leña con recetas tradicionales italianas y pasta fresca.',               address: 'Blvd. Moctezuma 88, Col. Las Palmas, Tapachula, Chiapas, C.P. 30720', phone: '+52 962 625 0003', cuisine_type: 'Italian',  owner_id: IDS.owner1, is_open: false, rating: 4.2 },
  ];

  for (const r of restaurants) {
    await pool.query(
      `INSERT INTO restaurants (id, name, description, address, phone, cuisine_type, owner_id, is_open, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [r.id, r.name, r.description, r.address, r.phone, r.cuisine_type, r.owner_id, r.is_open, r.rating]
    );
  }

  console.log('  ✓ Seeded restaurants (' + restaurants.length + ' rows)');
}

async function seedMenuItems(pool) {
  const items = [
    // Tacos El Güero
    { id: IDS.tacoPastor,    restaurant_id: IDS.tacosElGuero, name: 'Taco de Pastor',    description: 'Taco de carne al pastor con piña, cilantro y cebolla en tortilla de maíz.',     price: 35.00, category: 'Tacos',     is_available: true },
    { id: IDS.tacoBistec,    restaurant_id: IDS.tacosElGuero, name: 'Taco de Bistec',    description: 'Bistec de res asado a las brasas, con salsa verde y guacamole.',              price: 40.00, category: 'Tacos',     is_available: true },
    { id: IDS.quesadilla,    restaurant_id: IDS.tacosElGuero, name: 'Quesadilla',        description: 'Quesadilla de queso Oaxaca con champiñones y epazote.',                       price: 55.00, category: 'Antojitos', is_available: true },
    { id: IDS.horchata,      restaurant_id: IDS.tacosElGuero, name: 'Agua de Horchata',  description: 'Horchata de arroz con canela, fría y natural.',                                   price: 25.00, category: 'Bebidas',   is_available: true },
    // Sushi Nagoya
    { id: IDS.californiaRoll, restaurant_id: IDS.sushiNagoya, name: 'California Roll',   description: '8 piezas con cangrejo, aguacate y pepino, cubierto de ajonjolí.',            price: 95.00, category: 'Rolls',     is_available: true },
    { id: IDS.sashimiSalmon,  restaurant_id: IDS.sushiNagoya, name: 'Sashimi Salmón',    description: '6 láminas de salmón fresco importado, servido con wasabi y jengibre.',         price: 145.00, category: 'Sashimi',   is_available: true },
    { id: IDS.ramenTonkotsu, restaurant_id: IDS.sushiNagoya, name: 'Ramen Tonkotsu',    description: 'Caldo de cerdo 18 horas, fideos ramen, chashu, huevo marinado y nori.',       price: 135.00, category: 'Ramen',     is_available: true },
    { id: IDS.edamame,        restaurant_id: IDS.sushiNagoya, name: 'Edamame',           description: 'Vainas de soya al vapor con sal de mar.',                                     price: 45.00, category: 'Entradas',  is_available: true },
    // Pizza Roma
    { id: IDS.pizzaMargherita, restaurant_id: IDS.pizzaRoma, name: 'Pizza Margherita',  description: 'Salsa de tomate San Marzano, mozzarella fresca y albahaca. Horneada en leña.', price: 185.00, category: 'Pizzas',    is_available: true },
    { id: IDS.pizzaPepperoni,  restaurant_id: IDS.pizzaRoma, name: 'Pizza Pepperoni',   description: 'Doble capa de pepperoni importado sobre base de tomate y mozzarella.',         price: 210.00, category: 'Pizzas',    is_available: true },
    { id: IDS.pastaCarbonara,  restaurant_id: IDS.pizzaRoma, name: 'Pasta Carbonara',   description: 'Espagueti con panceta, yema de huevo, pecorino romano y pimienta negra.',       price: 155.00, category: 'Pastas',    is_available: true },
    { id: IDS.tiramisu,        restaurant_id: IDS.pizzaRoma, name: 'Tiramisú',          description: 'Postre clásico italiano con mascarpone, café espresso y cacao amargo.',        price: 85.00, category: 'Postres',   is_available: true },
  ];

  for (const item of items) {
    await pool.query(
      `INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [item.id, item.restaurant_id, item.name, item.description, item.price, item.category, item.is_available]
    );
  }

  console.log('  ✓ Seeded menu items (' + items.length + ' rows)');
}

async function seedDeliveryPeople(pool) {
  const drivers = [
    { id: IDS.deliveryPerson1, user_id: IDS.driver1, name: 'Carlos Mendoza', vehicle_type: 'MOTORCYCLE', status: 'AVAILABLE', rating: 4.8 },
    { id: IDS.deliveryPerson2, user_id: IDS.driver2, name: 'Ana López',      vehicle_type: 'BICYCLE',    status: 'AVAILABLE', rating: 4.9 },
    { id: IDS.deliveryPerson3, user_id: null,        name: 'Roberto Cruz',  vehicle_type: 'CAR',        status: 'OFFLINE',   rating: 4.7 },
    { id: IDS.deliveryPerson4, user_id: null,        name: 'María Torres',  vehicle_type: 'MOTORCYCLE', status: 'OFFLINE',   rating: 5.0 },
  ];

  for (const d of drivers) {
    await pool.query(
      `INSERT INTO delivery_people (id, user_id, name, vehicle_type, status, rating, current_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [d.id, d.user_id, d.name, d.vehicle_type, d.status, d.rating,
       d.vehicle_type === 'MOTORCYCLE'
         ? JSON.stringify({ latitude: 15.4915, longitude: -92.2168 })
         : d.vehicle_type === 'BICYCLE'
         ? JSON.stringify({ latitude: 15.4900, longitude: -92.2150 })
         : JSON.stringify({ latitude: 15.4930, longitude: -92.2180 })]
    );
  }

  console.log('  ✓ Seeded delivery people (' + drivers.length + ' rows)');
}

async function seedOrders(pool) {
  const address = JSON.stringify({
    street: 'Calle Demo 123',
    city: 'Ciudad de México',
    state: 'CDMX',
    zipCode: '06600',
    country: 'México',
    coordinates: { latitude: 19.4326, longitude: -99.1332 },
  });

  // Each order has 2 items
  const orderItems = {
    [IDS.order1]: [
      { menu_item_id: IDS.tacoPastor,   quantity: 3, price: 35.00, subtotal: 105.00 },
      { menu_item_id: IDS.horchata,     quantity: 2, price: 25.00, subtotal:  50.00 },
    ],
    [IDS.order2]: [
      { menu_item_id: IDS.californiaRoll, quantity: 2, price: 95.00, subtotal: 190.00 },
      { menu_item_id: IDS.edamame,         quantity: 1, price: 45.00, subtotal:  45.00 },
    ],
    [IDS.order3]: [
      { menu_item_id: IDS.pizzaPepperoni, quantity: 1, price: 210.00, subtotal: 210.00 },
      { menu_item_id: IDS.tiramisu,       quantity: 1, price:  85.00, subtotal:  85.00 },
    ],
    [IDS.order4]: [
      { menu_item_id: IDS.ramenTonkotsu, quantity: 2, price: 135.00, subtotal: 270.00 },
      { menu_item_id: IDS.sashimiSalmon,  quantity: 1, price: 145.00, subtotal: 145.00 },
    ],
    [IDS.order5]: [
      { menu_item_id: IDS.tacoBistec,  quantity: 4, price: 40.00, subtotal: 160.00 },
      { menu_item_id: IDS.quesadilla,   quantity: 1, price: 55.00, subtotal:  55.00 },
    ],
  };

  const orders = [
    { id: IDS.order1, customer_id: IDS.customer1, restaurant_id: IDS.tacosElGuero, status: 'READY',     total_amount: 155.00, delivery_address: address },
    { id: IDS.order2, customer_id: IDS.customer2, restaurant_id: IDS.sushiNagoya,  status: 'DELIVERED', total_amount: 235.00, delivery_address: address },
    { id: IDS.order3, customer_id: IDS.customer1, restaurant_id: IDS.pizzaRoma,    status: 'CONFIRMED', total_amount: 295.00, delivery_address: address },
    { id: IDS.order4, customer_id: IDS.customer2, restaurant_id: IDS.sushiNagoya,  status: 'PREPARING', total_amount: 415.00, delivery_address: address },
    { id: IDS.order5, customer_id: IDS.customer1, restaurant_id: IDS.tacosElGuero, status: 'PENDING',   total_amount: 215.00, delivery_address: address },
  ];

  for (const o of orders) {
    await pool.query(
      `INSERT INTO orders (id, customer_id, restaurant_id, status, total_amount, delivery_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [o.id, o.customer_id, o.restaurant_id, o.status, o.total_amount, o.delivery_address]
    );

    // Insert order items
    for (const item of orderItems[o.id]) {
      await pool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [o.id, item.menu_item_id, item.quantity, item.price, item.subtotal]
      );
    }
  }

  console.log('  ✓ Seeded orders (' + orders.length + ' rows with items)');
}

async function seedDeliveries(pool) {
  // order2 was DELIVERED with a driver assigned
  // order1 is READY (no driver yet — pending acceptance)
  const deliveries = [
    { id: 'f0000000-0000-0000-0000-000000000001', order_id: IDS.order2, delivery_person_id: IDS.deliveryPerson1, status: 'DELIVERED', pickup_time: new Date(Date.now() - 3600000), delivery_time: new Date(Date.now() - 1800000) },
    { id: 'f0000000-0000-0000-0000-000000000002', order_id: IDS.order1, delivery_person_id: null,             status: 'PENDING',   pickup_time: null,                    delivery_time: null },
  ];

  for (const d of deliveries) {
    await pool.query(
      `INSERT INTO deliveries (id, order_id, delivery_person_id, status, pickup_time, delivery_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [d.id, d.order_id, d.delivery_person_id, d.status, d.pickup_time, d.delivery_time]
    );
  }

  console.log('  ✓ Seeded deliveries (' + deliveries.length + ' rows)');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
function printSummary() {
  const d = '─'.repeat(70);

  console.log('\n' + d);
  console.log(' TEST CREDENTIALS SUMMARY');
  console.log(d);
  console.log('  Role               │ Email                │ Password');
  console.log(d);
  const rows = [
    ['ADMIN',             'admin@fooddelivery.com',  'Admin123!'],
    ['RESTAURANT_OWNER',  'owner1@test.com',         'Owner123!'],
    ['RESTAURANT_OWNER',  'owner2@test.com',         'Owner123!'],
    ['CUSTOMER',           'customer1@test.com',       'Customer123!'],
    ['CUSTOMER',           'customer2@test.com',       'Customer123!'],
    ['DELIVERY_PERSON',   'driver1@test.com',        'Driver123!'],
    ['DELIVERY_PERSON',   'driver2@test.com',        'Driver123!'],
  ];
  for (const [role, email, pw] of rows) {
    console.log(' ' + role.padEnd(19) + '│ ' + email.padEnd(24) + '│ ' + pw);
  }

  console.log('\n' + d);
  console.log(' RESTAURANTS');
  console.log(d);
  console.log(' Name                 │ Cuisine   │ Open │ Rating │ Owner');
  console.log(d);
  const rRows = [
    ['Tacos El Güero', 'Mexican',  'yes', '4.5', 'owner1@test.com'],
    ['Sushi Nagoya',   'Japanese', 'yes', '4.8', 'owner2@test.com'],
    ['Pizza Roma',    'Italian',  'no',  '4.2', 'owner1@test.com'],
  ];
  for (const [n, c, o, r, ow] of rRows) {
    console.log(' ' + n.padEnd(22) + '│ ' + c.padEnd(9) + '│ ' + o.padEnd(5) + '│ ' + r.padEnd(6) + '│ ' + ow);
  }

  console.log('\n' + d);
  console.log(' DELIVERY PEOPLE');
  console.log(d);
  const dpRows = [
    ['Carlos Mendoza', 'driver1@test.com', 'MOTORCYCLE', 'AVAILABLE'],
    ['Ana López',      'driver2@test.com', 'BICYCLE',    'AVAILABLE'],
    ['Roberto Cruz',   '(no login)',        'CAR',        'OFFLINE'],
    ['María Torres',   '(no login)',        'MOTORCYCLE', 'OFFLINE'],
  ];
  console.log('  Name               │ Email           │ Vehicle    │ Status');
  console.log(d);
  for (const [n, e, v, s] of dpRows) {
    console.log(' ' + n.padEnd(22) + '│ ' + e.padEnd(18) + '│ ' + v.padEnd(11) + '│ ' + s);
  }

  console.log('\n' + d);
  console.log(' ORDERS');
  console.log(d);
  const oRows = [
    [IDS.order1.slice(0, 8) + '…', 'Tacos El Güero',  'READY',     'customer1@test.com'],
    [IDS.order2.slice(0, 8) + '…', 'Sushi Nagoya',    'DELIVERED', 'customer2@test.com'],
    [IDS.order3.slice(0, 8) + '…', 'Pizza Roma',       'CONFIRMED', 'customer1@test.com'],
    [IDS.order4.slice(0, 8) + '…', 'Sushi Nagoya',    'PREPARING', 'customer2@test.com'],
    [IDS.order5.slice(0, 8) + '…', 'Tacos El Güero',  'PENDING',   'customer1@test.com'],
  ];
  console.log('  Order ID       │ Restaurant    │ Status    │ Customer');
  console.log(d);
  for (const [id, r, s, c] of oRows) {
    console.log(' ' + id.padEnd(20) + '│ ' + r.padEnd(16) + '│ ' + s.padEnd(10) + '│ ' + c);
  }

  console.log(d);
  console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\nFood Delivery Platform — Seed Script');
  console.log('=====================================\n');

  const authPool      = new Pool({ connectionString: AUTH_DB_URL });
  const restaurantPool = new Pool({ connectionString: RESTAURANT_DB_URL });
  const orderPool     = new Pool({ connectionString: ORDER_DB_URL });
  const deliveryPool  = new Pool({ connectionString: DELIVERY_DB_URL });

  try {
    console.log('Connecting to databases...');
    await Promise.all([
      authPool.query('SELECT 1'),
      restaurantPool.query('SELECT 1'),
      orderPool.query('SELECT 1'),
      deliveryPool.query('SELECT 1'),
    ]);
    console.log('  ✓ All connections OK\n');

    console.log('[auth_db]');
    await seedUsers(authPool);

    console.log('\n[restaurant_db]');
    await seedRestaurants(restaurantPool);
    await seedMenuItems(restaurantPool);

    console.log('\n[order_db]');
    await seedOrders(orderPool);

    console.log('\n[delivery_db]');
    await seedDeliveryPeople(deliveryPool);
    await seedDeliveries(deliveryPool);

    console.log('\n✓ All done. Database is ready for testing.');
    printSummary();
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await Promise.all([
      authPool.end(),
      restaurantPool.end(),
      orderPool.end(),
      deliveryPool.end(),
    ]);
  }
}

main();
