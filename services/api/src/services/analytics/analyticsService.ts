import { db } from '../../db/client';
import { analyticsEvents, classes, classattendance, classbookings, workouts, users, members } from '../../db/schema';
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

export interface GymUtilizationData {
  x_labels: string[]; // Time slots (e.g., ['6am', '7am', '8am', ...])
  y_labels: string[]; // Days of week (e.g., ['Mon', 'Tue', 'Wed', ...])
  values: number[][]; // Utilization percentages for each day/time combination
  averageUtilizationByHour: Array<{
    hour: string;
    averageUtilization: number;
  }>;
}

export interface BookingTimesData {
  hour: string;
  averageBookings: number;
  totalBookings: number;
  popularityRank: number;
}

export interface CohortRetentionData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
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
    
    // Build date conditions
    const dateConds = [] as any[];
    if (startDate) dateConds.push(gte(analyticsEvents.createdAt, new Date(startDate)));
    if (endDate) dateConds.push(lte(analyticsEvents.createdAt, new Date(endDate)));

    // Get all signup events in the date range
    const allSignupEvents = await db
      .select({
        id: analyticsEvents.id,
        createdAt: analyticsEvents.createdAt,
        eventType: analyticsEvents.eventType,
        properties: analyticsEvents.properties
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'user_signup'),
          ...dateConds
        )
      )
      .orderBy(analyticsEvents.createdAt);


    // Get all approval events in the date range
    const allApprovalEvents = await db
      .select({
        id: analyticsEvents.id,
        createdAt: analyticsEvents.createdAt,
        eventType: analyticsEvents.eventType,
        properties: analyticsEvents.properties
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, 'membership_approval'),
          ...dateConds
        )
      )
      .orderBy(analyticsEvents.createdAt);


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

      // Count events for this date period
      let signupCount = 0;
      let approvalCount = 0;

      for (const event of allSignupEvents) {
        const eventDate = new Date(event.createdAt!);
        let matches = false;

        switch (period) {
          case 'today':
            matches = eventDate.getFullYear() === currentDate.getFullYear() &&
                     eventDate.getMonth() === currentDate.getMonth() &&
                     eventDate.getDate() === currentDate.getDate() &&
                     eventDate.getHours() === currentDate.getHours();
            break;
          case 'lastWeek':
          case 'lastMonth':
            matches = eventDate.getFullYear() === currentDate.getFullYear() &&
                     eventDate.getMonth() === currentDate.getMonth() &&
                     eventDate.getDate() === currentDate.getDate();
            break;
          case 'lastYear':
          case 'all':
          default:
            matches = eventDate.getFullYear() === currentDate.getFullYear() &&
                     eventDate.getMonth() === currentDate.getMonth();
            break;
        }

        if (matches) signupCount++;
      }

      for (const event of allApprovalEvents) {
        const eventDate = new Date(event.createdAt!);
        let matches = false;

        switch (period) {
          case 'today':
            matches = eventDate.getFullYear() === currentDate.getFullYear() &&
                     eventDate.getMonth() === currentDate.getMonth() &&
                     eventDate.getDate() === currentDate.getDate() &&
                     eventDate.getHours() === currentDate.getHours();
            break;
          case 'lastWeek':
          case 'lastMonth':
            matches = eventDate.getFullYear() === currentDate.getFullYear() &&
                     eventDate.getMonth() === currentDate.getMonth() &&
                     eventDate.getDate() === currentDate.getDate();
            break;
          case 'lastYear':
          case 'all':
          default:
            matches = eventDate.getFullYear() === currentDate.getFullYear() &&
                     eventDate.getMonth() === currentDate.getMonth();
            break;
        }

        if (matches) approvalCount++;
      }

      signupData.push(signupCount);
      approvalData.push(approvalCount);
    }

    const result = {
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

    return result;
  }

  async getGymUtilization(weekStartDate?: string): Promise<GymUtilizationData> {
    // Default to current week if no date provided
    const startDate = weekStartDate ? new Date(weekStartDate) : this.getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // End of week

    // Get all classes in the specified week with their bookings
    const classesWithBookings = await db
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        capacity: classes.capacity,
        bookingCount: count(classbookings.bookingId),
      })
      .from(classes)
      .leftJoin(classbookings, eq(classes.classId, classbookings.classId))
      .where(
        and(
          gte(classes.scheduledDate, startDate.toISOString().slice(0, 10)),
          lte(classes.scheduledDate, endDate.toISOString().slice(0, 10))
        )
      )
      .groupBy(classes.classId, classes.scheduledDate, classes.scheduledTime, classes.capacity);

    // Create time slots for all business hours (6am to 10pm)
    const timeSlots = [
      '6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', 
      '5pm', '6pm', '7pm', '8pm', '9pm', '10pm'
    ];

    // Days of week
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize utilization matrix
    const utilizationMatrix: number[][] = [];
    for (let day = 0; day < 7; day++) {
      utilizationMatrix[day] = new Array(timeSlots.length).fill(0);
    }

    // Process each class and calculate utilization
    for (const classData of classesWithBookings) {
      const classDate = new Date(classData.scheduledDate);
      const dayOfWeek = classDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Parse time (format: "HH:MM:SS")
      const timeParts = classData.scheduledTime.split(':');
      const hour = parseInt(timeParts[0]);
      
      // Find the appropriate time slot index based on all business hours
      let timeSlotIndex = -1;
      if (hour >= 6 && hour <= 22) { // 6am to 10pm (22:00)
        timeSlotIndex = hour - 6; // Direct mapping: 6am = 0, 7am = 1, etc.
      }
      
      if (timeSlotIndex >= 0 && timeSlotIndex < timeSlots.length) {
        const utilization = classData.capacity > 0 ? (classData.bookingCount / classData.capacity) * 100 : 0;
        utilizationMatrix[dayOfWeek][timeSlotIndex] = Math.round(utilization * 100) / 100;
      }
    }

    // Calculate average utilization by hour across all days
    const averageUtilizationByHour = timeSlots.map((hour, index) => {
      const dayUtilizations = utilizationMatrix.map(day => day[index]).filter(val => val > 0);
      const average = dayUtilizations.length > 0 
        ? dayUtilizations.reduce((sum, val) => sum + val, 0) / dayUtilizations.length 
        : 0;
      
      return {
        hour,
        averageUtilization: Math.round(average * 100) / 100,
      };
    });

    return {
      x_labels: timeSlots,
      y_labels: daysOfWeek,
      values: utilizationMatrix,
      averageUtilizationByHour,
    };
  }

  async getBookingTimesAnalytics(): Promise<BookingTimesData[]> {
    // Get all time slots from 6am to 10pm (17 hours)
    const timeSlots = [
      '6am', '7am', '8am', '9am', '10am', '11am', '12pm', 
      '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm'
    ];

    // Get all bookings with their class times
    const bookingsData = await db
      .select({
        scheduledTime: classes.scheduledTime,
        scheduledDate: classes.scheduledDate,
        bookingId: classbookings.bookingId,
      })
      .from(classbookings)
      .innerJoin(classes, eq(classbookings.classId, classes.classId));

    // Group bookings by hour
    const bookingsByHour = new Map<string, number>();
    const totalBookings = bookingsData.length;

    bookingsData.forEach(booking => {
      const time = booking.scheduledTime;
      if (time) {
        // Convert time to hour format (e.g., "09:00:00" -> "9am")
        const hour = this.formatTimeToHour(time);
        if (hour) {
          bookingsByHour.set(hour, (bookingsByHour.get(hour) || 0) + 1);
        }
      }
    });

    // Calculate analytics for each time slot
    const analytics = timeSlots.map((hour, index) => {
      const totalBookingsForHour = bookingsByHour.get(hour) || 0;
      const averageBookings = totalBookings > 0 ? totalBookingsForHour / totalBookings : 0;
      
      return {
        hour,
        averageBookings: Math.round(averageBookings * 100) / 100, // Round to 2 decimal places
        totalBookings: totalBookingsForHour,
        popularityRank: index + 1, // Will be sorted by total bookings later
      };
    });

    // Sort by total bookings (descending) and update popularity rank
    const sortedAnalytics = analytics.sort((a, b) => b.totalBookings - a.totalBookings);
    return sortedAnalytics.map((item, index) => ({
      ...item,
      popularityRank: index + 1,
    }));
  }

  private formatTimeToHour(time: string): string | null {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const hour = hours % 12 || 12;
      const ampm = hours < 12 ? 'am' : 'pm';
      return `${hour}${ampm}`;
    } catch {
      return null;
    }
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day; // Adjust to start of week (Sunday)
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Get cohort retention analytics - percentage of users retained over time
   * Based on user signup month and their activity (class bookings/attendance) in subsequent months
   */
  async getCohortRetention(period?: string): Promise<CohortRetentionData> {
    const { startDate, endDate } = this.getDateRange(period);
    
    // Get all members with their first booking date as proxy for signup date
    const membersWithFirstBooking = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        firstBookingDate: sql<string>`MIN(${classbookings.bookedAt})`.as('firstBookingDate'),
      })
      .from(users)
      .innerJoin(members, eq(users.userId, members.userId))
      .leftJoin(classbookings, eq(users.userId, classbookings.memberId))
      .where(eq(members.status, 'approved'))
      .groupBy(users.userId, users.firstName, users.lastName)
      .orderBy(sql`MIN(${classbookings.bookedAt})`);

    // Filter out members who have never booked a class and apply date filtering
    const activeMembers = membersWithFirstBooking.filter(m => {
      if (!m.firstBookingDate) return false;
      
      const bookingDate = new Date(m.firstBookingDate);
      if (startDate && bookingDate < new Date(startDate)) return false;
      if (endDate && bookingDate > new Date(endDate)) return false;
      
      return true;
    });

    if (activeMembers.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Group members by signup month
    const cohorts = new Map<string, Array<{ userId: number; signupDate: string }>>();
    
    activeMembers.forEach(member => {
      const signupDate = new Date(member.firstBookingDate!);
      const cohortKey = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }
      cohorts.get(cohortKey)!.push({
        userId: member.userId,
        signupDate: member.firstBookingDate!
      });
    });

    // Calculate retention for each cohort
    const cohortRetentionData = new Map<string, number[]>();
    const allCohortKeys = Array.from(cohorts.keys()).sort();
    
    for (const [cohortKey, cohortMembers] of cohorts) {
      const signupDate = new Date(cohortMembers[0].signupDate);
      const retentionRates = [100]; // Month 0 is always 100%
      
      // Calculate retention for months 1, 2, 3, 6, 9, 12
      const retentionMonths = [1, 2, 3, 6, 9, 12];
      
      for (const monthOffset of retentionMonths) {
        const targetDate = new Date(signupDate);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        
        // Count active members in this month (those who booked or attended classes)
        const activeMembers = await this.getActiveMembersInMonth(
          cohortMembers.map(m => m.userId),
          targetDate
        );
        
        const retentionRate = cohortMembers.length > 0 
          ? Math.round((activeMembers / cohortMembers.length) * 100)
          : 0;
        
        retentionRates.push(retentionRate);
      }
      
      cohortRetentionData.set(cohortKey, retentionRates);
    }

    // Generate labels based on period
    let labels: string[];
    if (period === 'lastMonth' || period === 'lastYear' || period === 'all') {
      labels = ['Month 0', 'Month 1', 'Month 2', 'Month 3', 'Month 6', 'Month 9', 'Month 12'];
    } else {
      labels = ['Week 0', 'Week 1', 'Week 4', 'Week 8', 'Week 12', 'Week 24'];
    }

    // Calculate average retention across all cohorts
    const averageRetention = labels.map((_, index) => {
      let totalRetention = 0;
      let cohortCount = 0;
      
      for (const retentionRates of cohortRetentionData.values()) {
        if (retentionRates[index] !== undefined) {
          totalRetention += retentionRates[index];
          cohortCount++;
        }
      }
      
      return cohortCount > 0 ? Math.round(totalRetention / cohortCount) : 0;
    });

    return {
      labels,
      datasets: [
        {
          label: '% Members Retained',
          data: averageRetention,
          borderColor: '#d8ff3e',
          backgroundColor: 'rgba(216, 255, 62, 0.2)',
          fill: true,
          tension: 0.2,
        },
      ],
    };
  }

  /**
   * Helper method to count active members in a specific month
   * A member is considered active if they have booked or attended classes in that month
   */
  private async getActiveMembersInMonth(memberIds: number[], targetDate: Date): Promise<number> {
    if (memberIds.length === 0) return 0;

    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    // Find classes in the target month
    const classesInMonth = await db
      .select({ classId: classes.classId })
      .from(classes)
      .where(
        and(
          gte(classes.scheduledDate, startOfMonth.toISOString().slice(0, 10)),
          lte(classes.scheduledDate, endOfMonth.toISOString().slice(0, 10))
        )
      );

    if (classesInMonth.length === 0) return 0;

    const classIds = classesInMonth.map(c => c.classId);

    // Count unique members who either booked or attended classes in this month
    const activeMembers = await db
      .select({ memberId: classbookings.memberId })
      .from(classbookings)
      .where(
        and(
          sql`${classbookings.memberId} IN (${sql.join(memberIds, sql`, `)})`,
          sql`${classbookings.classId} IN (${sql.join(classIds, sql`, `)})`
        )
      );

    // Get unique member IDs
    const uniqueMemberIds = new Set(activeMembers.map(m => m.memberId));

    return uniqueMemberIds.size;
  }
}