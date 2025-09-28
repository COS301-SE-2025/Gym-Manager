#!/usr/bin/env ts-node
// Test database setup script
import { db } from '../db/client';
import { testConfig } from '../config/test.config';

async function setupTestDatabase() {
  try {
    console.log('Setting up test database...');
    console.log(
      'Database URL:',
      testConfig.database.url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'),
    );

    // Test database connection
    const result = await db.execute('SELECT 1 as test');
    console.log('Database connection successful:', result);

    // Create test tables if they don't exist
    // This would typically be handled by Drizzle migrations
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

async function cleanupTestDatabase() {
  try {
    console.log('Cleaning up test database...');

    // Clean up test data
    // This would be handled by individual test cleanup

    console.log('Test database cleanup complete');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'setup') {
    setupTestDatabase().then(() => process.exit(0));
  } else if (command === 'cleanup') {
    cleanupTestDatabase().then(() => process.exit(0));
  } else {
    console.log('Usage: npm run test:db:setup or npm run test:db:cleanup');
    process.exit(1);
  }
}

export { setupTestDatabase, cleanupTestDatabase };
