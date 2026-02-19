// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'zimcommerce_test';
process.env.JWT_SECRET = 'test_secret_key';

// Increase timeout for database operations
jest.setTimeout(10000);
