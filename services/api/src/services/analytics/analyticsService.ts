import { db } from '../../db/client';
import { analyticsEvents } from '../../db/schema';
import { LogEntry } from '../../domain/entities/analytics.entity';
import {
  IAnalyticsService,
  IAnalyticsRepository,
} from '../../domain/interfaces/analytics.interface';
import { AnalyticsRepository } from '../../repositories/analytics/analyticsRepository';

export class AnalyticsService implements IAnalyticsService {
  private analyticsRepository: IAnalyticsRepository;

  constructor(analyticsRepository?: IAnalyticsRepository) {
    this.analyticsRepository = analyticsRepository || new AnalyticsRepository();
  }

  async addLog(logEntry: LogEntry): Promise<void> {
    try {
      await db.insert(analyticsEvents).values({
        gymId: logEntry.gymId,
        userId: logEntry.userId,
        eventType: logEntry.eventType,
        properties: logEntry.properties,
        source: logEntry.source,
      });
    } catch (error) {
      console.error('Failed to add log:', error);
      // Depending on requirements, you might want to throw the error
      // or handle it silently. For now, we log it.
    }
  }

  async getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]> {
    return this.analyticsRepository.getLogs(startDate, endDate);
  }
}
