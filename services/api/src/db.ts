import { Pool } from 'pg';

// Basic connection file
const pool = new Pool({
  user: process.env.PG_USER || 'your_db_user',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'your_db_name',
  password: process.env.PG_PASSWORD || 'your_db_password',
  port: Number(process.env.PG_PORT) || 5432,
});

// Optional: handle connection errors globally
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
