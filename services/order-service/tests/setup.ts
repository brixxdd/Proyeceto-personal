process.env.JWT_SECRET = 'test-jwt-secret-key-for-unit-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/order_db_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.RESTAURANT_SERVICE_URL = 'http://localhost:3001';
process.env.NODE_ENV = 'test';
