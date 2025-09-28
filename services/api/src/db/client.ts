import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const url =
  process.env.DATABASE_URL ??
  `postgres://${process.env.PG_USER}:` +
    `${process.env.PG_PASSWORD}@` +
    `${process.env.PG_HOST}:${process.env.PG_PORT}/` +
    `${process.env.PG_DATABASE}`;


const pool = new Pool({
  connectionString: url,
  ssl: /supabase\.com/.test(url) ? { rejectUnauthorized: false } : undefined,
});

pool.on('connect', () => {
});

pool.on('error', (err) => {
});

export const db = drizzle(pool, { schema });
