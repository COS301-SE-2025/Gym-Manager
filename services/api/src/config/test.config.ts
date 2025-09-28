// Test configuration
export const testConfig = {
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/gym_manager_test',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DATABASE || 'gym_manager_test',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'test-secret-key-for-testing-only',
    expiresIn: '1h',
  },
  app: {
    nodeEnv: 'test',
    timeout: 10000,
    logLevel: 'error',
  },
  test: {
    timeout: 10000,
    retries: 3,
    parallel: false, // Integration tests should run sequentially
  },
};
