import { LogEntry } from '../entities/analytics.entity';

export interface IAnalyticsService {
  addLog(logEntry: LogEntry): Promise<void>;
  getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]>;
}

export interface IAnalyticsRepository {
  getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]>;
}
