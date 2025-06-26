// === services/api/src/controllers/healthController.ts ===
import { Request, Response } from 'express';
import { db } from '../db/client';
import { sql } from 'drizzle-orm';

const STARTED_AT = Number(process.env.APP_STARTED_AT ?? Date.now());

export const healthCheck = async (_req: Request, res: Response) => {
  const uptimeSec = Math.round((Date.now() - STARTED_AT) / 1000);
  const memBytes  = process.memoryUsage().rss;

  const ping = Promise.race([
    db.execute(sql`SELECT 1`),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), 100)
    ),
  ]);

  try {
    await ping;
    return res.json({
      ok     : true,
      uptime : uptimeSec,
      memory : memBytes,
      version: process.env.npm_package_version,
      db     : 'UP',
    });
  } catch (err) {
    const errorMessage = (err instanceof Error) ? err.message : String(err);
    console.error('Health-check DB ping failed:', errorMessage);
    return res.status(503).json({
      ok     : false,
      uptime : uptimeSec,
      db     : 'DOWN',
      error  : errorMessage,
    });
  }
};
