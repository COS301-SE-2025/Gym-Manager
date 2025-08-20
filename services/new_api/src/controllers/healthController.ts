// src/controllers/healthController.ts
import { Request, Response } from 'express';
import healthRepo from '../repositories/health.repository';

const STARTED_AT = Number(process.env.APP_STARTED_AT ?? Date.now());

export const healthCheck = async (_req: Request, res: Response) => {
  const uptimeSec = Math.round((Date.now() - STARTED_AT) / 1000);
  const memBytes = process.memoryUsage().rss;

  try {
    // call repo which will throw on timeout or DB failure
    await healthRepo.ping(100);
    return res.json({
      ok: true,
      uptime: uptimeSec,
      memory: memBytes,
      version: process.env.npm_package_version,
      db: 'UP',
    });
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Health-check DB ping failed:', errorMessage);
    return res.status(503).json({
      ok: false,
      uptime: uptimeSec,
      db: 'DOWN',
      error: errorMessage,
    });
  }
};
