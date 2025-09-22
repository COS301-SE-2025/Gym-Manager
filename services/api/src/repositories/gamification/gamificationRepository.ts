import { db } from '../../db/client';
import { userStreaks, userBadges, badgeDefinitions, userActivities, users, classattendance, classes, members } from '../../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { IGamificationRepository } from '../../domain/interfaces/gamification.interface';
import { BadgeDefinition, UserBadge, UserStreak, UserActivity } from '../../domain/entities/gamification.entity';

export class GamificationRepository implements IGamificationRepository {
  // Streak operations
  async findUserStreak(userId: number): Promise<UserStreak | null> {
    const result = await db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId))
      .limit(1);

    if (result.length === 0) return null;

    const streak = result[0];
    return {
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate ? new Date(streak.lastActivityDate) : undefined,
      streakStartDate: streak.streakStartDate ? new Date(streak.streakStartDate) : undefined,
      totalWorkouts: streak.totalWorkouts,
      totalPoints: streak.totalPoints,
      level: streak.level,
      updatedAt: streak.updatedAt ? new Date(streak.updatedAt) : undefined,
    };
  }

  async createUserStreak(userStreak: Omit<UserStreak, 'updatedAt'>): Promise<UserStreak> {
    const result = await db
      .insert(userStreaks)
      .values({
        userId: userStreak.userId,
        currentStreak: userStreak.currentStreak,
        longestStreak: userStreak.longestStreak,
        lastActivityDate: userStreak.lastActivityDate?.toISOString().split('T')[0],
        streakStartDate: userStreak.streakStartDate?.toISOString().split('T')[0],
        totalWorkouts: userStreak.totalWorkouts,
        totalPoints: userStreak.totalPoints,
        level: userStreak.level,
      })
      .returning();

    const streak = result[0];
    return {
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate ? new Date(streak.lastActivityDate) : undefined,
      streakStartDate: streak.streakStartDate ? new Date(streak.streakStartDate) : undefined,
      totalWorkouts: streak.totalWorkouts,
      totalPoints: streak.totalPoints,
      level: streak.level,
      updatedAt: streak.updatedAt ? new Date(streak.updatedAt) : undefined,
    };
  }

  async updateUserStreak(userId: number, updates: Partial<UserStreak>): Promise<UserStreak> {
    // console.log(`💾 updateUserStreak repository called for user ${userId}`);
    // console.log(`📝 Updates:`, updates);

    const updateData: any = {};

    if (updates.currentStreak !== undefined) updateData.currentStreak = updates.currentStreak;
    if (updates.longestStreak !== undefined) updateData.longestStreak = updates.longestStreak;
    if (updates.lastActivityDate !== undefined) updateData.lastActivityDate = updates.lastActivityDate?.toISOString().split('T')[0];
    if (updates.streakStartDate !== undefined) updateData.streakStartDate = updates.streakStartDate?.toISOString().split('T')[0];
    if (updates.totalWorkouts !== undefined) updateData.totalWorkouts = updates.totalWorkouts;
    if (updates.totalPoints !== undefined) updateData.totalPoints = updates.totalPoints;
    if (updates.level !== undefined) updateData.level = updates.level;

    // console.log(`🗄️ Database update data:`, updateData);

    const result = await db
      .update(userStreaks)
      .set(updateData)
      .where(eq(userStreaks.userId, userId))
      .returning();

    // console.log(`✅ Database update result:`, result);

    const streak = result[0];
    return {
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate ? new Date(streak.lastActivityDate) : undefined,
      streakStartDate: streak.streakStartDate ? new Date(streak.streakStartDate) : undefined,
      totalWorkouts: streak.totalWorkouts,
      totalPoints: streak.totalPoints,
      level: streak.level,
      updatedAt: streak.updatedAt ? new Date(streak.updatedAt) : undefined,
    };
  }

  // Badge operations
  async findUserBadges(userId: number, limit?: number): Promise<UserBadge[]> {
    const query = db
      .select({
        userBadgeId: userBadges.userBadgeId,
        userId: userBadges.userId,
        badgeId: userBadges.badgeId,
        earnedAt: userBadges.earnedAt,
        isDisplayed: userBadges.isDisplayed,
        badge: {
          badgeId: badgeDefinitions.badgeId,
          name: badgeDefinitions.name,
          description: badgeDefinitions.description,
          iconName: badgeDefinitions.iconName,
          badgeType: badgeDefinitions.badgeType,
          criteria: badgeDefinitions.criteria,
          pointsValue: badgeDefinitions.pointsValue,
          isActive: badgeDefinitions.isActive,
          createdAt: badgeDefinitions.createdAt,
        }
      })
      .from(userBadges)
      .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.badgeId))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));

    if (limit) {
      query.limit(limit);
    }

    const results = await query;
    
    return results.map(row => ({
      userBadgeId: row.userBadgeId,
      userId: row.userId,
      badgeId: row.badgeId,
      earnedAt: new Date(row.earnedAt),
      isDisplayed: row.isDisplayed,
      badge: {
        badgeId: row.badge.badgeId,
        name: row.badge.name,
        description: row.badge.description,
        iconName: row.badge.iconName,
        badgeType: row.badge.badgeType as any,
        criteria: row.badge.criteria as any,
        pointsValue: row.badge.pointsValue,
        isActive: row.badge.isActive,
        createdAt: row.badge.createdAt ? new Date(row.badge.createdAt) : undefined,
      }
    }));
  }

  async findUserBadge(userId: number, badgeId: number): Promise<UserBadge | null> {
    const result = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
      .limit(1);

    if (result.length === 0) return null;

    const userBadge = result[0];
    return {
      userBadgeId: userBadge.userBadgeId,
      userId: userBadge.userId,
      badgeId: userBadge.badgeId,
      earnedAt: new Date(userBadge.earnedAt),
      isDisplayed: userBadge.isDisplayed,
    };
  }

  async createUserBadge(userBadge: Omit<UserBadge, 'userBadgeId' | 'earnedAt'>): Promise<UserBadge> {
    const result = await db
      .insert(userBadges)
      .values({
        userId: userBadge.userId,
        badgeId: userBadge.badgeId,
        isDisplayed: userBadge.isDisplayed,
      })
      .returning();

    const badge = result[0];
    return {
      userBadgeId: badge.userBadgeId,
      userId: badge.userId,
      badgeId: badge.badgeId,
      earnedAt: new Date(badge.earnedAt),
      isDisplayed: badge.isDisplayed,
    };
  }

  async findBadgeDefinitions(): Promise<BadgeDefinition[]> {
    const results = await db
      .select()
      .from(badgeDefinitions)
      .where(eq(badgeDefinitions.isActive, true))
      .orderBy(badgeDefinitions.pointsValue);

    return results.map(badge => ({
      badgeId: badge.badgeId,
      name: badge.name,
      description: badge.description,
      iconName: badge.iconName,
      badgeType: badge.badgeType as any,
      criteria: badge.criteria as any,
      pointsValue: badge.pointsValue,
      isActive: badge.isActive,
      createdAt: badge.createdAt ? new Date(badge.createdAt) : undefined,
    }));
  }

  async findBadgeDefinition(badgeId: number): Promise<BadgeDefinition | null> {
    const result = await db
      .select()
      .from(badgeDefinitions)
      .where(eq(badgeDefinitions.badgeId, badgeId))
      .limit(1);

    if (result.length === 0) return null;

    const badge = result[0];
    return {
      badgeId: badge.badgeId,
      name: badge.name,
      description: badge.description,
      iconName: badge.iconName,
      badgeType: badge.badgeType as any,
      criteria: badge.criteria as any,
      pointsValue: badge.pointsValue,
      isActive: badge.isActive,
      createdAt: badge.createdAt ? new Date(badge.createdAt) : undefined,
    };
  }

  // Activity operations
  async createUserActivity(activity: Omit<UserActivity, 'activityId' | 'createdAt'>): Promise<UserActivity> {
    const result = await db
      .insert(userActivities)
      .values({
        userId: activity.userId,
        activityType: activity.activityType,
        activityData: activity.activityData,
        pointsEarned: activity.pointsEarned,
      })
      .returning();

    const userActivity = result[0];
    return {
      activityId: userActivity.activityId,
      userId: userActivity.userId,
      activityType: userActivity.activityType,
      activityData: userActivity.activityData as any,
      pointsEarned: userActivity.pointsEarned,
      createdAt: new Date(userActivity.createdAt),
    };
  }

  async findUserActivities(userId: number, limit?: number): Promise<UserActivity[]> {
    const query = db
      .select()
      .from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt));

    if (limit) {
      query.limit(limit);
    }

    const results = await query;
    
    return results.map(activity => ({
      activityId: activity.activityId,
      userId: activity.userId,
      activityType: activity.activityType,
      activityData: activity.activityData as any,
      pointsEarned: activity.pointsEarned,
      createdAt: new Date(activity.createdAt),
    }));
  }

  // Analytics queries
  async getStreakLeaderboard(limit: number = 10): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>> {
    const results = await db
      .select({
        user: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        streak: {
          userId: userStreaks.userId,
          currentStreak: userStreaks.currentStreak,
          longestStreak: userStreaks.longestStreak,
          lastActivityDate: userStreaks.lastActivityDate,
          streakStartDate: userStreaks.streakStartDate,
          totalWorkouts: userStreaks.totalWorkouts,
          totalPoints: userStreaks.totalPoints,
          level: userStreaks.level,
          updatedAt: userStreaks.updatedAt,
        }
      })
      .from(userStreaks)
      .innerJoin(users, eq(userStreaks.userId, users.userId))
      .innerJoin(members, eq(users.userId, members.userId))
      .where(eq(members.publicVisibility, true))
      .orderBy(desc(userStreaks.currentStreak))
      .limit(limit);

    return results.map(row => ({
      user: row.user,
      streak: {
        userId: row.streak.userId,
        currentStreak: row.streak.currentStreak,
        longestStreak: row.streak.longestStreak,
        lastActivityDate: row.streak.lastActivityDate ? new Date(row.streak.lastActivityDate) : undefined,
        streakStartDate: row.streak.streakStartDate ? new Date(row.streak.streakStartDate) : undefined,
        totalWorkouts: row.streak.totalWorkouts,
        totalPoints: row.streak.totalPoints,
        level: row.streak.level,
        updatedAt: row.streak.updatedAt ? new Date(row.streak.updatedAt) : undefined,
      }
    }));
  }

  async getPointsLeaderboard(limit: number = 10): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>> {
    const results = await db
      .select({
        user: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        streak: {
          userId: userStreaks.userId,
          currentStreak: userStreaks.currentStreak,
          longestStreak: userStreaks.longestStreak,
          lastActivityDate: userStreaks.lastActivityDate,
          streakStartDate: userStreaks.streakStartDate,
          totalWorkouts: userStreaks.totalWorkouts,
          totalPoints: userStreaks.totalPoints,
          level: userStreaks.level,
          updatedAt: userStreaks.updatedAt,
        }
      })
      .from(userStreaks)
      .innerJoin(users, eq(userStreaks.userId, users.userId))
      .innerJoin(members, eq(users.userId, members.userId))
      .where(eq(members.publicVisibility, true))
      .orderBy(desc(userStreaks.totalPoints))
      .limit(limit);

    return results.map(row => ({
      user: row.user,
      streak: {
        userId: row.streak.userId,
        currentStreak: row.streak.currentStreak,
        longestStreak: row.streak.longestStreak,
        lastActivityDate: row.streak.lastActivityDate ? new Date(row.streak.lastActivityDate) : undefined,
        streakStartDate: row.streak.streakStartDate ? new Date(row.streak.streakStartDate) : undefined,
        totalWorkouts: row.streak.totalWorkouts,
        totalPoints: row.streak.totalPoints,
        level: row.streak.level,
        updatedAt: row.streak.updatedAt ? new Date(row.streak.updatedAt) : undefined,
      }
    }));
  }

  async getUserWorkoutCount(userId: number, startDate?: Date, endDate?: Date): Promise<number> {
    let query = db
      .select({ count: sql<number>`count(*)` })
      .from(classattendance)
      .where(eq(classattendance.memberId, userId));

    if (startDate) {
      query = query.where(and(
        eq(classattendance.memberId, userId),
        gte(classattendance.markedAt, startDate.toISOString())
      ));
    }

    if (endDate) {
      query = query.where(and(
        eq(classattendance.memberId, userId),
        lte(classattendance.markedAt, endDate.toISOString())
      ));
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  async getUserWorkoutHistory(userId: number, days: number = 30): Promise<Array<{ date: Date; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<Date>`DATE(${classattendance.markedAt})`,
        count: sql<number>`count(*)`
      })
      .from(classattendance)
      .where(and(
        eq(classattendance.memberId, userId),
        gte(classattendance.markedAt, startDate.toISOString())
      ))
      .groupBy(sql`DATE(${classattendance.markedAt})`)
      .orderBy(sql`DATE(${classattendance.markedAt})`);

    return results.map(row => ({
      date: new Date(row.date),
      count: row.count
    }));
  }

  async getUserClassAttendanceHistory(userId: number, days: number = 30): Promise<Array<{ date: Date; timeOfDay: string; classId: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<Date>`DATE(${classattendance.markedAt})`,
        timeOfDay: sql<string>`CASE 
          WHEN EXTRACT(HOUR FROM ${classattendance.markedAt}) < 12 THEN 'morning'
          WHEN EXTRACT(HOUR FROM ${classattendance.markedAt}) < 17 THEN 'afternoon'
          ELSE 'evening'
        END`,
        classId: classattendance.classId
      })
      .from(classattendance)
      .where(and(
        eq(classattendance.memberId, userId),
        gte(classattendance.markedAt, startDate.toISOString())
      ))
      .orderBy(sql`DATE(${classattendance.markedAt})`);

    return results.map(row => ({
      date: new Date(row.date),
      timeOfDay: row.timeOfDay,
      classId: row.classId
    }));
  }
}
