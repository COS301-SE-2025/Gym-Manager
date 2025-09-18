import { db } from '../../db/client';
import { analyticsEvents, classes, classattendance, workouts } from '../../db/schema';
import { LogEntry, CreateLogEntry } from '../../domain/entities/analytics.entity';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.interface';
import { AnalyticsRepository } from '../../repositories/analytics/analyticsRepository';
import { eq, sql, desc, count } from 'drizzle-orm';

export interface CoachAnalytics {
  averageAttendance: number;
  totalClasses: number;
  averageFillRate: number;
  attendanceTrends: Array<{
    date: string;
    attendance: number;
    capacity: number;
    fillRate: number;
  }>;
}

export interface MemberAnalytics {
  averageLeaderboardPosition: number;
  totalClassesAttended: number;
  classPerformance: Array<{
    classId: number;
    workoutName: string;
    scheduledDate: string;
    position: number;
    totalParticipants: number;
    score: number | null;
  }>;
}

export class AnalyticsService {
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
    const { startDate, endDate } = this.getDateRange(period);
    const bookingEvents = await this.analyticsRepository.getLogs(startDate, endDate);
    const bookings = bookingEvents.filter(log => log.eventType === 'class_booking');
    const cancellations = bookingEvents.filter(log => log.eventType === 'class_cancellation');
    const attendances = bookingEvents.filter(log => log.eventType === 'class_attendance');

    const totalBookings = bookings.length;
    const totalCancellations = cancellations.length;
    const totalAttendances = attendances.length;

    const fillRate = totalBookings > 0 ? totalAttendances / totalBookings : 0;
    const cancellationRate = totalBookings > 0 ? totalCancellations / totalBookings : 0;
    const noShowRate = totalBookings > 0 ? (totalBookings - totalAttendances - totalCancellations) / totalBookings : 0;

    return {
      totalBookings,
      fillRate: Math.round(fillRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
    };
  }

  private getDateRange(period?: string): { startDate?: string; endDate?: string } {
    const now = new Date();
    switch (period) {
      case 'today': {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        return { startDate: today.toISOString(), endDate: endOfToday.toISOString() };
      }
      case 'lastWeek': {
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return { startDate: lastWeekStart.toISOString(), endDate: lastWeekEnd.toISOString() };
      }
      case 'lastMonth': {
        const lastMonthStart = new Date(now);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        lastMonthStart.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(now);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return { startDate: lastMonthStart.toISOString(), endDate: lastMonthEnd.toISOString() };
      }
      case 'lastYear': {
        const lastYearStart = new Date(now);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        lastYearStart.setHours(0, 0, 0, 0);
        const lastYearEnd = new Date(now);
        lastYearEnd.setHours(23, 59, 59, 999);
        return { startDate: lastYearStart.toISOString(), endDate: lastYearEnd.toISOString() };
      }
      case 'all':
      default:
        return {};
    }
  }

  async getCoachAnalytics(coachId: number): Promise<CoachAnalytics> {
    const coachClasses = await db
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        workoutId: classes.workoutId,
        workoutName: workouts.workoutName,
        capacity: classes.capacity,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(eq(classes.coachId, coachId));

    if (coachClasses.length === 0) {
      return {
        averageAttendance: 0,
        totalClasses: 0,
        averageFillRate: 0,
        attendanceTrends: [],
      };
    }

    const attendanceData = await db
      .select({
        classId: classattendance.classId,
        attendanceCount: count(classattendance.memberId),
      })
      .from(classattendance)
      .where(
        sql`${classattendance.classId} IN (${sql.join(
          coachClasses.map(c => c.classId),
          sql`, `
        )})`
      )
      .groupBy(classattendance.classId);

    const totalAttendance = attendanceData.reduce((sum, data) => sum + data.attendanceCount, 0);
    const averageAttendance = coachClasses.length > 0 ? totalAttendance / coachClasses.length : 0;

    const totalCapacity = coachClasses.reduce((sum, classData) => sum + classData.capacity, 0);
    const averageFillRate = totalCapacity > 0 ? (totalAttendance / totalCapacity) * 100 : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentClasses = coachClasses.filter(classData => 
      new Date(classData.scheduledDate) >= thirtyDaysAgo
    ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const attendanceTrends = recentClasses.map(classData => {
      const attendance = attendanceData.find(a => a.classId === classData.classId)?.attendanceCount || 0;
      const fillRate = classData.capacity > 0 ? (attendance / classData.capacity) * 100 : 0;
      
      return {
        date: classData.scheduledDate,
        attendance,
        capacity: classData.capacity,
        fillRate: Math.round(fillRate * 100) / 100,
      };
    });

    return {
      averageAttendance: Math.round(averageAttendance * 100) / 100,
      totalClasses: coachClasses.length,
      averageFillRate: Math.round(averageFillRate * 100) / 100,
      attendanceTrends,
    };
  }

  async getMemberAnalytics(memberId: number): Promise<MemberAnalytics> {
    const memberAttendance = await db
      .select({
        classId: classattendance.classId,
        score: classattendance.score,
        markedAt: classattendance.markedAt,
        workoutName: workouts.workoutName,
        scheduledDate: classes.scheduledDate,
      })
      .from(classattendance)
      .innerJoin(classes, eq(classattendance.classId, classes.classId))
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(eq(classattendance.memberId, memberId))
      .orderBy(desc(classattendance.markedAt));

    if (memberAttendance.length === 0) {
      return {
        averageLeaderboardPosition: 0,
        totalClassesAttended: 0,
        classPerformance: [],
      };
    }

    const classPerformance = [] as MemberAnalytics['classPerformance'];
    let totalPosition = 0;

    for (const attendance of memberAttendance) {
      const allParticipants = await db
        .select({
          memberId: classattendance.memberId,
          score: classattendance.score,
        })
        .from(classattendance)
        .where(eq(classattendance.classId, attendance.classId))
        .orderBy(desc(classattendance.score));

      const position = allParticipants.findIndex(p => p.memberId === memberId) + 1;
      totalPosition += position;

      classPerformance.push({
        classId: attendance.classId,
        workoutName: attendance.workoutName || 'Unknown Workout',
        scheduledDate: attendance.scheduledDate,
        position,
        totalParticipants: allParticipants.length,
        score: attendance.score,
      });
    }

    const averageLeaderboardPosition = memberAttendance.length > 0 
      ? Math.round((totalPosition / memberAttendance.length) * 100) / 100 
      : 0;

    return {
      averageLeaderboardPosition,
      totalClassesAttended: memberAttendance.length,
      classPerformance,
    };
  }
}