// src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  user: process.env.PG_USER!,
  host: process.env.PG_HOST!,
  database: process.env.PG_DATABASE!,
  password: process.env.PG_PASSWORD!,
  port: Number(process.env.PG_PORT!),
});

export const db = drizzle(pool, { schema });