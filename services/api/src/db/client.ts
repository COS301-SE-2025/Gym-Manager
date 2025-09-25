import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

console.log('--- DRIZZLE CLIENT DB CONNECTION ATTEMPT ---');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL (masked):', process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@') : 'undefined');

const url =
  process.env.DATABASE_URL 
  ?? `postgres://${process.env.PG_USER}:` +
     `${process.env.PG_PASSWORD}@` +
     `${process.env.PG_HOST}:${process.env.PG_PORT}/` +
     `${process.env.PG_DATABASE}`;

console.log('Using connection URL (masked):', url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));

const pool = new Pool({
  connectionString: url,
  ssl: /supabase\.com/.test(url) ? { rejectUnauthorized: false } : undefined,
});

pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Drizzle client pool error:', err);
});

export const db = drizzle(pool, { schema });
