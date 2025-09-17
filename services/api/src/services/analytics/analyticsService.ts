import { db } from '../../db/client';
import { analyticsEvents } from '../../db/schema';
import { LogEntry, CreateLogEntry } from '../../domain/entities/analytics.entity';
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

  async addLog(logEntry: CreateLogEntry): Promise<void> {
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

  async getSummaryStats(period?: string): Promise<{
    totalBookings: number;
    fillRate: number;
    cancellationRate: number;
    noShowRate: number;
  }> {
    // Calculate date range based on period
    const { startDate, endDate } = this.getDateRange(period);
    
    // Get booking events within the date range
    const bookingEvents = await this.analyticsRepository.getLogs(startDate, endDate);
    const bookings = bookingEvents.filter(log => log.eventType === 'class_booking');
    const cancellations = bookingEvents.filter(log => log.eventType === 'class_cancellation');
    const attendances = bookingEvents.filter(log => log.eventType === 'class_attendance');

    const totalBookings = bookings.length;
    const totalCancellations = cancellations.length;
    const totalAttendances = attendances.length;

    // Calculate rates
    const fillRate = totalBookings > 0 ? totalAttendances / totalBookings : 0;
    const cancellationRate = totalBookings > 0 ? totalCancellations / totalBookings : 0;
    const noShowRate = totalBookings > 0 ? (totalBookings - totalAttendances - totalCancellations) / totalBookings : 0;

    return {
      totalBookings,
      fillRate: Math.round(fillRate * 100) / 100, // Round to 2 decimal places
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
    };
  }

  private getDateRange(period?: string): { startDate?: string; endDate?: string } {
    const now = new Date();
    
    switch (period) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        return {
          startDate: today.toISOString(),
          endDate: endOfToday.toISOString(),
        };
      
      case 'lastWeek':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return {
          startDate: lastWeekStart.toISOString(),
          endDate: lastWeekEnd.toISOString(),
        };
      
      case 'lastMonth':
        const lastMonthStart = new Date(now);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        lastMonthStart.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(now);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return {
          startDate: lastMonthStart.toISOString(),
          endDate: lastMonthEnd.toISOString(),
        };
      
      case 'lastYear':
        const lastYearStart = new Date(now);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        lastYearStart.setHours(0, 0, 0, 0);
        const lastYearEnd = new Date(now);
        lastYearEnd.setHours(23, 59, 59, 999);
        return {
          startDate: lastYearStart.toISOString(),
          endDate: lastYearEnd.toISOString(),
        };
      
      case 'all':
      default:
        return {}; // No date filtering for all time
    }
  }
}
