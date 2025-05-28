// src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Ensure dotenv is loaded as early as possible
dotenv.config();

console.log('--- DRIZZLE CLIENT DB CONNECTION ATTEMPT ---');
console.log('Attempting to connect Drizzle client with .env values:');
console.log('PG_USER:', process.env.PG_USER);
console.log('PG_HOST:', process.env.PG_HOST);
console.log('PG_DATABASE:', process.env.PG_DATABASE);
console.log('PG_PASSWORD (exists?):', !!process.env.PG_PASSWORD);
console.log('PG_PORT:', process.env.PG_PORT);
console.log('DATABASE_URL (first 30 chars, if exists):', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'Not set');
console.log('-------------------------------------------');

const pool = new Pool({
  user: process.env.PG_USER!,
  host: process.env.PG_HOST!,
  database: process.env.PG_DATABASE!,
  password: process.env.PG_PASSWORD!,
  port: Number(process.env.PG_PORT!),
});

pool.on('connect', () => {
  console.log('Drizzle client pool successfully connected to PostgreSQL!');
});

pool.on('error', (err) => {
    console.error('Drizzle client pool error:', err);
});

export const db = drizzle(pool, { schema });