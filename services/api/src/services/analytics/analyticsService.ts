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

  async getOperationsData(period?: string): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
    }>;
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
      .select({ 
        classId: classes.classId, 
        capacity: classes.capacity,
        scheduledDate: classes.scheduledDate
      })
      .from(classes)
      .where(classDateConds.length ? and(...classDateConds) : undefined as any)
      .orderBy(classes.scheduledDate);

    if (classesInPeriod.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Group classes by date and calculate metrics for each date
    const dateGroups = new Map<string, {
      capacity: number;
      bookings: number;
      attendance: number;
      cancellations: number;
    }>();

    // Initialize date groups
    classesInPeriod.forEach(cls => {
      if (!dateGroups.has(cls.scheduledDate)) {
        dateGroups.set(cls.scheduledDate, {
          capacity: 0,
          bookings: 0,
          attendance: 0,
          cancellations: 0
        });
      }
      const group = dateGroups.get(cls.scheduledDate)!;
      group.capacity += cls.capacity;
    });

    const classIds = classesInPeriod.map(c => c.classId);

    // Get bookings for each class
    if (classIds.length > 0) {
      const bookingsData = await db
        .select({
          classId: classbookings.classId,
          count: count(classbookings.bookingId)
        })
        .from(classbookings)
        .where(sql`${classbookings.classId} IN (${sql.join(classIds, sql`, `)})`)
        .groupBy(classbookings.classId);

      // Map bookings to dates
      bookingsData.forEach(booking => {
        const classData = classesInPeriod.find(c => c.classId === booking.classId);
        if (classData) {
          const group = dateGroups.get(classData.scheduledDate)!;
          group.bookings += booking.count;
        }
      });
    }

    // Get attendance for each class
    if (classIds.length > 0) {
      const attendanceData = await db
        .select({
          classId: classattendance.classId,
          count: count(classattendance.memberId)
        })
        .from(classattendance)
        .where(sql`${classattendance.classId} IN (${sql.join(classIds, sql`, `)})`)
        .groupBy(classattendance.classId);

      // Map attendance to dates
      attendanceData.forEach(attendance => {
        const classData = classesInPeriod.find(c => c.classId === attendance.classId);
        if (classData) {
          const group = dateGroups.get(classData.scheduledDate)!;
          group.attendance += attendance.count;
        }
      });
    }

    // Get cancellations for each class
    if (classIds.length > 0) {
      const cancellationData = await db
        .select({
          classId: sql`(${analyticsEvents.properties} ->> 'classId')::int`.as('classId'),
          count: count(analyticsEvents.id)
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventType, 'class_cancellation'),
            sql`( ${analyticsEvents.properties} ->> 'classId')::int IN (${sql.join(classIds, sql`, `)})`
          )
        )
        .groupBy(sql`(${analyticsEvents.properties} ->> 'classId')::int`);

      // Map cancellations to dates
      cancellationData.forEach(cancellation => {
        const classData = classesInPeriod.find(c => c.classId === cancellation.classId);
        if (classData) {
          const group = dateGroups.get(classData.scheduledDate)!;
          group.cancellations += cancellation.count;
        }
      });
    }

    // Convert to chart format
    const sortedDates = Array.from(dateGroups.keys()).sort();
    const labels = sortedDates.map(date => {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    });

    const capacityData = sortedDates.map(date => dateGroups.get(date)!.capacity);
    const bookingsData = sortedDates.map(date => dateGroups.get(date)!.bookings);
    const attendanceData = sortedDates.map(date => dateGroups.get(date)!.attendance);
    const cancellationsData = sortedDates.map(date => dateGroups.get(date)!.cancellations);
    const noShowsData = sortedDates.map(date => {
      const group = dateGroups.get(date)!;
      return group.bookings - group.attendance;
    });

    return {
      labels,
      datasets: [
        { label: 'Capacity', data: capacityData, borderColor: '#4b5563' },
        { label: 'Bookings', data: bookingsData, borderColor: '#3b82f6' },
        { label: 'Attendance', data: attendanceData, borderColor: '#22c55e' },
        { label: 'Cancellations', data: cancellationsData, borderColor: '#f97316' },
        { label: 'No-Shows', data: noShowsData, borderColor: '#ef4444' },
      ]
    };
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

    // Count bookings for classes held in the selected period
    let totalBookings = 0;
    if (classIds.length > 0) {
      const bookingCountRows = await db
        .select({ value: count(classbookings.bookingId) })
        .from(classbookings)
        .where(sql`${classbookings.classId} IN (${sql.join(classIds, sql`, `)})`);
      totalBookings = bookingCountRows[0]?.value ?? 0;
    }

    // Count actual attendances for classes held in the selected period
    let totalAttendances = 0;
    if (classIds.length > 0) {
      const attendanceCountRows = await db
        .select({ value: count(classattendance.memberId) })
        .from(classattendance)
        .where(sql`${classattendance.classId} IN (${sql.join(classIds, sql`, `)})`);
      totalAttendances = attendanceCountRows[0]?.value ?? 0;
    }

    // Count cancellations from analytics events logs for classes in the selected period
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

    // Calculate metrics based on the requirements:
    // 1. Total Bookings: Total bookings for classes held in the period (already correct)
    // 2. Fill Rate: Percentage of bookings made compared to capacity of classes held in the period
    const fillRate = totalCapacity > 0 ? totalBookings / totalCapacity : 0;
    
    // 3. Cancellation Rate: Number of cancellations compared to total bookings for classes held in the period
    const cancellationRate = totalBookings > 0 ? totalCancellations / totalBookings : 0;
    
    // 4. No Show Rate: Percentage of people who actually attended vs total bookings for classes held in the period
    const noShowRate = totalBookings > 0 ? totalAttendances / totalBookings : 0;

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

  async getUserAcquisitionData(period?: string): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
    }>;
  }> {
    const { startDate, endDate } = this.getDateRange(period);
    
    // Determine grouping based on period
    let groupBy: string;
    switch (period) {
      case 'today':
        groupBy = 'DATE_TRUNC(\'hour\', created_at)';
        break;
      case 'lastWeek':
        groupBy = 'DATE(created_at)';
        break;
      case 'lastMonth':
        groupBy = 'DATE(created_at)';
        break;
      case 'lastYear':
        groupBy = 'DATE_TRUNC(\'month\', created_at)';
        break;
      case 'all':
      default:
        groupBy = 'DATE_TRUNC(\'month\', created_at)';
        break;
    }

    // Build date conditions
    const dateConds = [] as any[];
    if (startDate) dateConds.push(gte(analyticsEvents.createdAt, new Date(startDate)));
    if (endDate) dateConds.push(lte(analyticsEvents.createdAt, new Date(endDate)));

    // Get signup events
    const signupEvents = await db
      .select({
        date: sql<string>`${sql.raw(groupBy)}`,
        count: count(analyticsEvents.id)
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'user_signup'),
          ...dateConds
        )
      )
      .groupBy(sql.raw(groupBy))
      .orderBy(sql.raw(groupBy));

    // Get approval events
    const approvalEvents = await db
      .select({
        date: sql<string>`${sql.raw(groupBy)}`,
        count: count(analyticsEvents.id)
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'membership_approval'),
          ...dateConds
        )
      )
      .groupBy(sql.raw(groupBy))
      .orderBy(sql.raw(groupBy));

    // Create date range for consistent labels
    const labels: string[] = [];
    const signupData: number[] = [];
    const approvalData: number[] = [];

    const currentDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDateObj = endDate ? new Date(endDate) : new Date();

    while (currentDate <= endDateObj) {
      let label: string;
      let dateKey: string;

      switch (period) {
        case 'today':
          label = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
          dateKey = currentDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
          currentDate.setHours(currentDate.getHours() + 1);
          break;
        case 'lastWeek':
        case 'lastMonth':
          label = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateKey = currentDate.toISOString().split('T')[0];
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'lastYear':
          label = currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'all':
        default:
          label = currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }

      labels.push(label);

      // Find data for this date
      const signupCount = signupEvents.find(e => e.date.startsWith(dateKey))?.count || 0;
      const approvalCount = approvalEvents.find(e => e.date.startsWith(dateKey))?.count || 0;

      signupData.push(signupCount);
      approvalData.push(approvalCount);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Signups',
          data: signupData,
          borderColor: '#3b82f6',
        },
        {
          label: 'Approvals',
          data: approvalData,
          borderColor: '#22c55e',
        },
      ],
    };
  }
}