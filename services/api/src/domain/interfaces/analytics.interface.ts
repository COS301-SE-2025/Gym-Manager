import { LogEntry, CreateLogEntry } from '../entities/analytics.entity';

export interface IAnalyticsService {
  addLog(logEntry: CreateLogEntry): Promise<void>;
  getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]>;
}

export interface IAnalyticsRepository {
  getLogs(startDate?: string, endDate?: string): Promise<LogEntry[]>;
}
