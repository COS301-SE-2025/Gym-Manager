import { db } from '../../db/client';
import { analyticsEvents, classes, classattendance, classbookings, workouts } from '../../db/schema';
import { LogEntry, CreateLogEntry } from '../../domain/entities/analytics.entity';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.interface';
import { AnalyticsRepository } from '../../repositories/analytics/analyticsRepository';
import { eq, sql, desc, count, and, gte, lte } from 'drizzle-orm';

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

    // Convert ISO datetime to date-only where needed for classes.scheduledDate
    const startDateOnly = startDate ? startDate.slice(0, 10) : undefined;
    const endDateOnly = endDate ? endDate.slice(0, 10) : undefined;

    // Find classes in the selected period (by scheduled date)
    const classDateConds = [] as any[];
    if (startDateOnly) classDateConds.push(gte(classes.scheduledDate, startDateOnly));
    if (endDateOnly) classDateConds.push(lte(classes.scheduledDate, endDateOnly));

    const classesInPeriod = await db
      .select({ classId: classes.classId, capacity: classes.capacity })
      .from(classes)
      .where(classDateConds.length ? and(...classDateConds) : undefined as any);

    const classIds = classesInPeriod.map(c => c.classId);
    const totalCapacity = classesInPeriod.reduce((sum, c) => sum + c.capacity, 0);

    // Count bookings for those classes
    let totalBookings = 0;
    if (classIds.length > 0) {
      const bookingCountRows = await db
        .select({ value: count(classbookings.bookingId) })
        .from(classbookings)
        .where(sql`${classbookings.classId} IN (${sql.join(classIds, sql`, `)})`);
      totalBookings = bookingCountRows[0]?.value ?? 0;
    }

    // Count attendances for those classes
    let totalAttendances = 0;
    if (classIds.length > 0) {
      const attendanceCountRows = await db
        .select({ value: count(classattendance.memberId) })
        .from(classattendance)
        .where(sql`${classattendance.classId} IN (${sql.join(classIds, sql`, `)})`);
      totalAttendances = attendanceCountRows[0]?.value ?? 0;
    }

    // Count cancellations from analytics events logs only, but scoped to classes in period
    let totalCancellations = 0;
    if (classIds.length > 0) {
      const cancellationCountRows = await db
        .select({ value: count(analyticsEvents.id) })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventType, 'class_cancellation'),
            // properties->>'classId' cast to int should be in classIds
            sql`( ${analyticsEvents.properties} ->> 'classId')::int IN (${sql.join(classIds, sql`, `)})`
          )
        );
      totalCancellations = cancellationCountRows[0]?.value ?? 0;
    } else {
      // Fallback to date range if no classes found in period
      const cancellationConditions = [eq(analyticsEvents.eventType, 'class_cancellation')] as any[];
      if (startDate) cancellationConditions.push(gte(analyticsEvents.createdAt, new Date(startDate)));
      if (endDate) cancellationConditions.push(lte(analyticsEvents.createdAt, new Date(endDate)));
      const cancellationCountRows = await db
        .select({ value: count(analyticsEvents.id) })
        .from(analyticsEvents)
        .where(and(...cancellationConditions));
      totalCancellations = cancellationCountRows[0]?.value ?? 0;
    }

    // Fill rate: bookings per capacity of classes in the period
    const fillRate = totalCapacity > 0 ? totalBookings / totalCapacity : 0;
    const cancellationRate = totalBookings > 0 ? totalCancellations / totalBookings : 0;
    const noShowRate = totalBookings > 0 ? (totalBookings - totalAttendances) / totalBookings : 0;

    return {
      totalBookings,
      fillRate,
      cancellationRate,
      noShowRate,
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
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'lastYear': {
        const start = new Date(now);
        start.setDate(start.getDate() - 365);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
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