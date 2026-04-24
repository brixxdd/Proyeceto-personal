'use strict';

/**
 * Seed script for the food delivery platform.
 * Inserts realistic test data into auth_db and restaurant_db.
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

  // Restaurants
  tacosElGuero:  'b0000000-0000-0000-0000-000000000001',
  sushiNagoya:   'b0000000-0000-0000-0000-000000000002',
  pizzaRoma:     'b0000000-0000-0000-0000-000000000003',

  // Menu items — Tacos El Güero
  tacoPastor:    'c0000000-0000-0000-0000-000000000001',
  tacoBistec:    'c0000000-0000-0000-0000-000000000002',
  quesadilla:    'c0000000-0000-0000-0000-000000000003',
  horchata:      'c0000000-0000-0000-0000-000000000004',

  // Menu items — Sushi Nagoya
  californiaRoll:  'c0000000-0000-0000-0000-000000000005',
  sashimiSalmon:   'c0000000-0000-0000-0000-000000000006',
  ramenTonkotsu:   'c0000000-0000-0000-0000-000000000007',
  edamame:         'c0000000-0000-0000-0000-000000000008',

  // Menu items — Pizza Roma
  pizzaMargherita:  'c0000000-0000-0000-0000-000000000009',
  pizzaPepperoni:   'c0000000-0000-0000-0000-000000000010',
  pastaCarbonara:   'c0000000-0000-0000-0000-000000000011',
  tiramisu:         'c0000000-0000-0000-0000-000000000012',
};

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, 10);
}

async function seedUsers(pool) {
  const [adminHash, ownerHash, customerHash] = await Promise.all([
    hashPassword('Admin123!'),
    hashPassword('Owner123!'),
    hashPassword('Customer123!'),
  ]);

  const users = [
    {
      id:            IDS.adminUser,
      email:         'admin@fooddelivery.com',
      password_hash: adminHash,
      name:          'Admin User',
      phone:         '+52 961 000 0000',
      role:          'ADMIN',
    },
    {
      id:            IDS.owner1,
      email:         'owner1@test.com',
      password_hash: ownerHash,
      name:          'Carlos Gutiérrez',
      phone:         '+52 961 111 1111',
      role:          'RESTAURANT_OWNER',
    },
    {
      id:            IDS.owner2,
      email:         'owner2@test.com',
      password_hash: ownerHash,
      name:          'Yuki Tanaka',
      phone:         '+52 961 222 2222',
      role:          'RESTAURANT_OWNER',
    },
    {
      id:            IDS.customer1,
      email:         'customer1@test.com',
      password_hash: customerHash,
      name:          'María López',
      phone:         '+52 961 333 3333',
      role:          'CUSTOMER',
    },
    {
      id:            IDS.customer2,
      email:         'customer2@test.com',
      password_hash: customerHash,
      name:          'Juan Pérez',
      phone:         '+52 961 444 4444',
      role:          'CUSTOMER',
    },
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
    {
      id:           IDS.tacosElGuero,
      name:         'Tacos El Güero',
      description:  'Los mejores tacos al pastor de Tapachula, con salsas artesanales y tortillas hechas a mano.',
      address:      'Calle Central Nte. 12, Col. Centro, Tapachula, Chiapas, C.P. 30700',
      phone:        '+52 962 625 0001',
      cuisine_type: 'Mexican',
      owner_id:     IDS.owner1,
      is_open:      true,
      rating:       4.5,
    },
    {
      id:           IDS.sushiNagoya,
      name:         'Sushi Nagoya',
      description:  'Auténtica cocina japonesa con ingredientes frescos importados. Sushi, ramen y más.',
      address:      'Av. Central Poniente 45, Col. Ferrocarrilera, Tapachula, Chiapas, C.P. 30710',
      phone:        '+52 962 625 0002',
      cuisine_type: 'Japanese',
      owner_id:     IDS.owner2,
      is_open:      true,
      rating:       4.8,
    },
    {
      id:           IDS.pizzaRoma,
      name:         'Pizza Roma',
      description:  'Pizzas al horno de leña con recetas tradicionales italianas y pasta fresca.',
      address:      'Blvd. Moctezuma 88, Col. Las Palmas, Tapachula, Chiapas, C.P. 30720',
      phone:        '+52 962 625 0003',
      cuisine_type: 'Italian',
      owner_id:     IDS.owner1,
      is_open:      false,
      rating:       4.2,
    },
  ];

  for (const r of restaurants) {
    await pool.query(
      `INSERT INTO restaurants
         (id, name, description, address, phone, cuisine_type, owner_id, is_open, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [r.id, r.name, r.description, r.address, r.phone, r.cuisine_type, r.owner_id, r.is_open, r.rating]
    );
  }

  console.log('  ✓ Seeded restaurants (' + restaurants.length + ' rows)');
}

async function seedMenuItems(pool) {
  const items = [
    // --- Tacos El Güero ---
    {
      id:            IDS.tacoPastor,
      restaurant_id: IDS.tacosElGuero,
      name:          'Taco de Pastor',
      description:   'Taco de carne al pastor con piña, cilantro y cebolla en tortilla de maíz.',
      price:         35.00,
      category:      'Tacos',
      is_available:  true,
    },
    {
      id:            IDS.tacoBistec,
      restaurant_id: IDS.tacosElGuero,
      name:          'Taco de Bistec',
      description:   'Bistec de res asado a las brasas, con salsa verde y guacamole.',
      price:         40.00,
      category:      'Tacos',
      is_available:  true,
    },
    {
      id:            IDS.quesadilla,
      restaurant_id: IDS.tacosElGuero,
      name:          'Quesadilla',
      description:   'Quesadilla de queso Oaxaca con champiñones y epazote.',
      price:         55.00,
      category:      'Antojitos',
      is_available:  true,
    },
    {
      id:            IDS.horchata,
      restaurant_id: IDS.tacosElGuero,
      name:          'Agua de Horchata',
      description:   'Horchata de arroz con canela, fría y natural.',
      price:         25.00,
      category:      'Bebidas',
      is_available:  true,
    },

    // --- Sushi Nagoya ---
    {
      id:            IDS.californiaRoll,
      restaurant_id: IDS.sushiNagoya,
      name:          'California Roll',
      description:   '8 piezas con cangrejo, aguacate y pepino, cubierto de ajonjolí.',
      price:         95.00,
      category:      'Rolls',
      is_available:  true,
    },
    {
      id:            IDS.sashimiSalmon,
      restaurant_id: IDS.sushiNagoya,
      name:          'Sashimi Salmón',
      description:   '6 láminas de salmón fresco importado, servido con wasabi y jengibre.',
      price:         145.00,
      category:      'Sashimi',
      is_available:  true,
    },
    {
      id:            IDS.ramenTonkotsu,
      restaurant_id: IDS.sushiNagoya,
      name:          'Ramen Tonkotsu',
      description:   'Caldo de cerdo 18 horas, fideos ramen, chashu, huevo marinado y nori.',
      price:         135.00,
      category:      'Ramen',
      is_available:  true,
    },
    {
      id:            IDS.edamame,
      restaurant_id: IDS.sushiNagoya,
      name:          'Edamame',
      description:   'Vainas de soya al vapor con sal de mar.',
      price:         45.00,
      category:      'Entradas',
      is_available:  true,
    },

    // --- Pizza Roma ---
    {
      id:            IDS.pizzaMargherita,
      restaurant_id: IDS.pizzaRoma,
      name:          'Pizza Margherita',
      description:   'Salsa de tomate San Marzano, mozzarella fresca y albahaca. Horneada en leña.',
      price:         185.00,
      category:      'Pizzas',
      is_available:  true,
    },
    {
      id:            IDS.pizzaPepperoni,
      restaurant_id: IDS.pizzaRoma,
      name:          'Pizza Pepperoni',
      description:   'Doble capa de pepperoni importado sobre base de tomate y mozzarella.',
      price:         210.00,
      category:      'Pizzas',
      is_available:  true,
    },
    {
      id:            IDS.pastaCarbonara,
      restaurant_id: IDS.pizzaRoma,
      name:          'Pasta Carbonara',
      description:   'Espagueti con panceta, yema de huevo, pecorino romano y pimienta negra.',
      price:         155.00,
      category:      'Pastas',
      is_available:  true,
    },
    {
      id:            IDS.tiramisu,
      restaurant_id: IDS.pizzaRoma,
      name:          'Tiramisú',
      description:   'Postre clásico italiano con mascarpone, café espresso y cacao amargo.',
      price:         85.00,
      category:      'Postres',
      is_available:  true,
    },
  ];

  for (const item of items) {
    await pool.query(
      `INSERT INTO menu_items
         (id, restaurant_id, name, description, price, category, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [item.id, item.restaurant_id, item.name, item.description, item.price, item.category, item.is_available]
    );
  }

  console.log('  ✓ Seeded menu items (' + items.length + ' rows)');
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------
function printSummary() {
  const divider = '─'.repeat(70);

  console.log('\n' + divider);
  console.log(' TEST CREDENTIALS SUMMARY');
  console.log(divider);
  console.log(
    ' Role              │ Email                      │ Password'
  );
  console.log(divider);

  const rows = [
    ['ADMIN',            'admin@fooddelivery.com',  'Admin123!'],
    ['RESTAURANT_OWNER', 'owner1@test.com',         'Owner123!'],
    ['RESTAURANT_OWNER', 'owner2@test.com',         'Owner123!'],
    ['CUSTOMER',         'customer1@test.com',      'Customer123!'],
    ['CUSTOMER',         'customer2@test.com',      'Customer123!'],
  ];

  for (const [role, email, password] of rows) {
    console.log(
      ' ' +
      role.padEnd(18) + '│ ' +
      email.padEnd(26) + '│ ' +
      password
    );
  }

  console.log(divider);
  console.log('\n RESTAURANTS');
  console.log(divider);
  console.log(' Name                  │ Cuisine  │ Open  │ Rating │ Owner');
  console.log(divider);

  const restaurants = [
    ['Tacos El Güero',  'Mexican',  'yes', '4.5', 'owner1@test.com'],
    ['Sushi Nagoya',    'Japanese', 'yes', '4.8', 'owner2@test.com'],
    ['Pizza Roma',      'Italian',  'no',  '4.2', 'owner1@test.com'],
  ];

  for (const [name, cuisine, open, rating, owner] of restaurants) {
    console.log(
      ' ' +
      name.padEnd(22) + '│ ' +
      cuisine.padEnd(8) + '│ ' +
      open.padEnd(5) + ' │ ' +
      rating.padEnd(6) + ' │ ' +
      owner
    );
  }

  console.log(divider);
  console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\nFood Delivery Platform — Seed Script');
  console.log('=====================================\n');

  const authPool = new Pool({ connectionString: AUTH_DB_URL });
  const restaurantPool = new Pool({ connectionString: RESTAURANT_DB_URL });

  try {
    // ---- auth_db ----
    console.log('Connecting to auth_db...');
    await authPool.query('SELECT 1');
    console.log('  ✓ Connected\n');

    console.log('Seeding auth_db...');
    await seedUsers(authPool);

    // ---- restaurant_db ----
    console.log('\nConnecting to restaurant_db...');
    await restaurantPool.query('SELECT 1');
    console.log('  ✓ Connected\n');

    console.log('Seeding restaurant_db...');
    await seedRestaurants(restaurantPool);
    await seedMenuItems(restaurantPool);

    console.log('\n✓ All done. Database is ready for testing.');
    printSummary();
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await authPool.end();
    await restaurantPool.end();
  }
}

main();
