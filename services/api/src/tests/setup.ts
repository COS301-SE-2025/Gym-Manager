// Test setup file for Jest
import 'dotenv/config';
import { testConfig } from '../config/test.config';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = testConfig.app.nodeEnv;
process.env.JWT_SECRET = testConfig.jwt.secret;
process.env.DATABASE_URL = testConfig.database.url;
process.env.PG_HOST = testConfig.database.host;
process.env.PG_PORT = testConfig.database.port.toString();
process.env.PG_USER = testConfig.database.user;
process.env.PG_PASSWORD = testConfig.database.password;
process.env.PG_DATABASE = testConfig.database.database;
process.env.APP_STARTED_AT = Date.now().toString();

// Global test timeout
jest.setTimeout(testConfig.test.timeout);

// Global test configuration
beforeAll(async () => {
  // Set up test database if needed
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Clean up test database if needed
  console.log('Cleaning up test environment...');
});
