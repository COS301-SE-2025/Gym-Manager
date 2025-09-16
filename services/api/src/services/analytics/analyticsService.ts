import { db } from '../../db/client';
import { 
  classes, 
  classattendance, 
  classbookings, 
  workouts, 
  users,
  members,
  coaches
} from '../../db/schema';
import { eq, and, sql, desc, avg, count } from 'drizzle-orm';

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
  /**
   * Get analytics for a coach including average attendance and workout popularity
   */
  async getCoachAnalytics(coachId: number): Promise<CoachAnalytics> {
    // Get all classes taught by this coach
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

    // Calculate average attendance across all classes
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

    // Calculate average fill rate
    const totalCapacity = coachClasses.reduce((sum, classData) => sum + classData.capacity, 0);
    const averageFillRate = totalCapacity > 0 ? (totalAttendance / totalCapacity) * 100 : 0;

    // Calculate attendance trends (last 30 days)
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

  /**
   * Get analytics for a member including average leaderboard performance
   */
  async getMemberAnalytics(memberId: number): Promise<MemberAnalytics> {
    // Get all classes attended by this member with their performance
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

    // Calculate leaderboard position for each class
    const classPerformance = [];
    let totalPosition = 0;

    for (const attendance of memberAttendance) {
      // Get all participants for this class to calculate position
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
