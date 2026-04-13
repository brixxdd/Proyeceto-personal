-- Script para inicializar múltiples bases de datos PostgreSQL

CREATE DATABASE auth_db;
CREATE DATABASE restaurant_db;
CREATE DATABASE order_db;
CREATE DATABASE delivery_db;
CREATE DATABASE notification_db;

-- Crear usuarios específicos por base de datos (opcional, para mayor seguridad)
-- CREATE USER auth_user WITH PASSWORD 'auth_password';
-- CREATE USER restaurant_user WITH PASSWORD 'restaurant_password';
-- CREATE USER order_user WITH PASSWORD 'order_password';
-- CREATE USER delivery_user WITH PASSWORD 'delivery_password';

-- GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;
-- GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO restaurant_user;
-- GRANT ALL PRIVILEGES ON DATABASE order_db TO order_user;
-- GRANT ALL PRIVILEGES ON DATABASE delivery_db TO delivery_user;

