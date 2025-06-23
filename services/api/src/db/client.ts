// src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Ensure dotenv is loaded as early as possible
dotenv.config();

console.log('--- DRIZZLE CLIENT DB CONNECTION ATTEMPT ---');


const pool = new Pool({
  user: process.env.PG_USER!,
  host: process.env.PG_HOST!,
  database: process.env.PG_DATABASE!,
  password: process.env.PG_PASSWORD!,
  port: Number(process.env.PG_PORT!),
});

pool.on('connect', () => {
  //console.log('Drizzle client pool successfully connected to PostgreSQL!');
});

pool.on('error', (err) => {
    console.error('Drizzle client pool error:', err);
});

export const db = drizzle(pool, { schema });