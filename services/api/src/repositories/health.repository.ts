// src/repositories/health.repository.ts
import { db as globalDb } from '../db/client';
import { sql } from 'drizzle-orm';

export class HealthRepository {
  /**
   * Ping DB, rejects on timeout.
   * Throws any DB error or a 'timeout' Error when timed out.
   */
  async ping(timeoutMs = 100): Promise<void> {
    // Promise that rejects after timeoutMs
    const timeoutP = new Promise((_res, rej) =>
      setTimeout(() => rej(new Error('timeout')), timeoutMs),
    );

    // db.execute returns a promise; race it with timeout
    await Promise.race([globalDb.execute(sql`SELECT 1`), timeoutP]);
  }
}

export default new HealthRepository();
