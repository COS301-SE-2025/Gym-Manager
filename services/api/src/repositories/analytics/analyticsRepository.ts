import { db } from '../../db/client';
import { analyticsEvents } from '../../db/schema';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.interface';
import { LogEntry } from '../../domain/entities/analytics.entity';
import { and, gte, lte, sql } from 'drizzle-orm';

export class AnalyticsRepository implements IAnalyticsRepository {
  async getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(analyticsEvents.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(analyticsEvents.createdAt, new Date(endDate)));
    }

    return db
      .select()
      .from(analyticsEvents)
      .where(and(...conditions))
      .orderBy(sql`${analyticsEvents.createdAt} DESC`);
  }
}
