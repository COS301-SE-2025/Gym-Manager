import { db as globalDb } from '../../db/client';
import { sql } from 'drizzle-orm';
import { IHealthRepository } from '../../domain/interfaces/health.interface';

/**
 * HealthRepository - Persistence Layer
 * Implements IHealthRepository interface and handles all database operations
 */
export class HealthRepository implements IHealthRepository {
  /**
   * Ping DB, rejects on timeout.
   * Throws any DB error or a 'timeout' Error when timed out.
   */
  async ping(timeoutMs = 5000): Promise<void> {

    
    // Promise that rejects after timeoutMs
    const timeoutP = new Promise((_res, rej) =>
      setTimeout(() => rej(new Error('timeout')), timeoutMs),
    );

    try {
      // db.execute returns a promise; race it with timeout
      await Promise.race([globalDb.execute(sql`SELECT 1`), timeoutP]);
    } catch (error) {
      throw error;
    }
  }
}
