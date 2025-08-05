// src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Ensure dotenv is loaded as early as possible
dotenv.config();

console.log('--- DRIZZLE CLIENT DB CONNECwwwwwwTION ATTEMPT ---');

const url =
  process.env.DATABASE_URL // Production URL
  ?? `postgres://${process.env.PG_USER}:` +
     `${process.env.PG_PASSWORD}@` +
     `${process.env.PG_HOST}:${process.env.PG_PORT}/` +
     `${process.env.PG_DATABASE}`;

const pool = new Pool({
  connectionString: url,
  ssl: /supabase\.com/.test(url) ? { rejectUnauthorized: false } : undefined,
});

pool.on('connect', () => {
  console.log('Drizzle client pool successfully connected to PostgreSQL!');
});

pool.on('error', (err) => {
  console.error('Drizzle client pool error:', err);
});

export const db = drizzle(pool, { schema });
