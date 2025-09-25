import { LogEntry, CreateLogEntry } from '../entities/analytics.entity';

export interface IAnalyticsService {
  addLog(logEntry: CreateLogEntry): Promise<void>;
  getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]>;
  getSummaryStats(period?: string): Promise<{
    totalBookings: number;
    fillRate: number;
    cancellationRate: number;
    noShowRate: number;
  }>;
}

export interface IAnalyticsRepository {
  getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]>;
}
