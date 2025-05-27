import { Pool } from 'pg';
import dotenv from 'dotenv';

// Ensure dotenv is loaded as early as possible
dotenv.config(); // You can also try: dotenv.config({ path: require('path').resolve(__dirname, '../.env') }); if path is an issue

console.log('--- DATABASE CONNECTION ATTEMPT ---');
console.log('Attempting to connect with the following .env values:');
console.log('PG_USER:', process.env.PG_USER);
console.log('PG_HOST:', process.env.PG_HOST);
console.log('PG_DATABASE:', process.env.PG_DATABASE);
console.log('PG_PASSWORD (exists?):', !!process.env.PG_PASSWORD); // Don't log the actual password
console.log('PG_PORT:', process.env.PG_PORT);
console.log('DATABASE_URL (first 30 chars, if exists):', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'Not set');
console.log('----------------------------------');

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT), // Ensure this is a number
});

pool.on('connect', () => {
  console.log('Successfully connected to PostgreSQL pool!');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client in pool', err);
  process.exit(-1); // Consider more graceful handling
});

export default pool;
