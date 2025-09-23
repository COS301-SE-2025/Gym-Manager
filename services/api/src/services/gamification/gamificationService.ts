import { IGamificationService } from '../../domain/interfaces/gamification.interface';
import { IGamificationRepository } from '../../domain/interfaces/gamification.interface';
import { BadgeDefinition, UserBadge, UserStreak, UserActivity, GamificationStats, ActivityData, BadgeCriteria } from '../../domain/entities/gamification.entity';

export class GamificationService implements IGamificationService {
  constructor(private gamificationRepository: IGamificationRepository) {}

  // Streak management
  async updateUserStreak(userId: number, activityDate: Date): Promise<UserStreak> {
    const existingStreak = await this.gamificationRepository.findUserStreak(userId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activityDay = new Date(activityDate);
    activityDay.setHours(0, 0, 0, 0);

    if (!existingStreak) {
      // Create new streak
      const newStreak: Omit<UserStreak, 'updatedAt'> = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: activityDay,
        streakStartDate: activityDay,
        totalWorkouts: 1,
        totalPoints: 10, // Base points for workout
        level: 1,
      };
      return await this.gamificationRepository.createUserStreak(newStreak);
    }

    const lastActivity = existingStreak.lastActivityDate;
    if (!lastActivity) {
      // First activity
      return await this.gamificationRepository.updateUserStreak(userId, {
        currentStreak: 1,
        longestStreak: Math.max(1, existingStreak.longestStreak),
        lastActivityDate: activityDay,
        streakStartDate: activityDay,
        totalWorkouts: existingStreak.totalWorkouts + 1,
        totalPoints: existingStreak.totalPoints + 10,
        level: this.calculateLevel(existingStreak.totalPoints + 10),
      });
    }

    const lastActivityDay = new Date(lastActivity);
    lastActivityDay.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.floor((activityDay.getTime() - lastActivityDay.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = existingStreak.currentStreak;
    let newStreakStart = existingStreak.streakStartDate;

    if (daysDifference === 0) {
      // Same day - no streak change, just update points
      return await this.gamificationRepository.updateUserStreak(userId, {
        totalWorkouts: existingStreak.totalWorkouts + 1,
        totalPoints: existingStreak.totalPoints + 10,
        level: this.calculateLevel(existingStreak.totalPoints + 10),
      });
    } else if (daysDifference === 1) {
      // Consecutive day - continue streak
      newStreak = existingStreak.currentStreak + 1;
    } else if (daysDifference > 1) {
      // Gap in streak - reset
      newStreak = 1;
      newStreakStart = activityDay;
    }

    const newLongestStreak = Math.max(newStreak, existingStreak.longestStreak);
    const newTotalPoints = existingStreak.totalPoints + 10 + (newStreak > 1 ? Math.min(newStreak * 2, 50) : 0); // Bonus points for streaks
    const newLevel = this.calculateLevel(newTotalPoints);

    return await this.gamificationRepository.updateUserStreak(userId, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: activityDay,
      streakStartDate: newStreakStart,
      totalWorkouts: existingStreak.totalWorkouts + 1,
      totalPoints: newTotalPoints,
      level: newLevel,
    });
  }

  async getUserStreak(userId: number): Promise<UserStreak | null> {
    return await this.gamificationRepository.findUserStreak(userId);
  }

  async resetUserStreak(userId: number): Promise<void> {
    await this.gamificationRepository.updateUserStreak(userId, {
      currentStreak: 0,
      lastActivityDate: undefined,
      streakStartDate: undefined,
    });
  }

  // Badge management
  async checkAndAwardBadges(userId: number, activityData: ActivityData): Promise<UserBadge[]> {
    const badgeDefinitions = await this.gamificationRepository.findBadgeDefinitions();
    const userStreak = await this.gamificationRepository.findUserStreak(userId);
    const userBadges = await this.gamificationRepository.findUserBadges(userId);
    const userWorkoutCount = await this.gamificationRepository.getUserWorkoutCount(userId);
    const userWorkoutHistory = await this.gamificationRepository.getUserWorkoutHistory(userId, 30);
    const userAttendanceHistory = await this.gamificationRepository.getUserClassAttendanceHistory(userId, 30);

    const newBadges: UserBadge[] = [];
    let totalBadgePoints = 0;

    for (const badgeDef of badgeDefinitions) {
      // Check if user already has this badge
      const hasBadge = userBadges.some(ub => ub.badgeId === badgeDef.badgeId);
      if (hasBadge) continue;

      // Check if user meets criteria
      if (await this.checkBadgeCriteria(badgeDef, userStreak, userWorkoutCount, userWorkoutHistory, userAttendanceHistory, activityData)) {
        const newBadge = await this.gamificationRepository.createUserBadge({
          userId,
          badgeId: badgeDef.badgeId,
          isDisplayed: true,
        });
        newBadge.badge = badgeDef;
        newBadges.push(newBadge);
        
        // Award points for earning the badge
        const badgePoints = this.calculateBadgePoints(badgeDef);
        totalBadgePoints += badgePoints;
      }
    }

    // Update user's total points and level if any badges were earned
    if (totalBadgePoints > 0 && newBadges.length > 0) {
      const currentStreak = await this.gamificationRepository.findUserStreak(userId);
      if (currentStreak) {
        const newTotalPoints = currentStreak.totalPoints + totalBadgePoints;
        const newLevel = this.calculateLevel(newTotalPoints);
        
        await this.gamificationRepository.updateUserStreak(userId, {
          totalPoints: newTotalPoints,
          level: newLevel,
        });
      }
    }

    return newBadges;
  }

  private async checkBadgeCriteria(
    badgeDef: BadgeDefinition,
    userStreak: UserStreak | null,
    userWorkoutCount: number,
    userWorkoutHistory: Array<{ date: Date; count: number }>,
    userAttendanceHistory: Array<{ date: Date; timeOfDay: string; classId: number }>,
    activityData: ActivityData
  ): Promise<boolean> {
    const criteria = badgeDef.criteria as BadgeCriteria;

    switch (badgeDef.name) {
      case 'First Steps':
        return userWorkoutCount >= (criteria.workouts_completed || 1);
      
      case 'Week Warrior':
        return (userStreak?.currentStreak || 0) >= (criteria.streak_days || 7);
      
      case 'Month Master':
        return (userStreak?.currentStreak || 0) >= (criteria.streak_days || 30);
      
      case 'Century Club':
        return userWorkoutCount >= (criteria.total_workouts || 100);
      
      case 'Early Bird':
        return await this.checkMorningWorkouts(userAttendanceHistory, criteria.morning_workouts || 5);
      
      case 'Night Owl':
        return await this.checkEveningWorkouts(userAttendanceHistory, criteria.evening_workouts || 5);
      
      case 'Consistency King':
        return await this.checkConsistency(userWorkoutHistory, criteria.weeks_consistent || 4);
      
      case 'Iron Will':
        return (userStreak?.currentStreak || 0) >= (criteria.streak_days || 50);
      
      case 'Legend':
        return (userStreak?.currentStreak || 0) >= (criteria.streak_days || 365);
      
      default:
        return false;
    }
  }

  private async checkMorningWorkouts(attendanceHistory: Array<{ date: Date; timeOfDay: string; classId: number }>, required: number): Promise<boolean> {
    const morningWorkouts = attendanceHistory.filter(attendance => attendance.timeOfDay === 'morning');
    return morningWorkouts.length >= required;
  }

  private async checkEveningWorkouts(attendanceHistory: Array<{ date: Date; timeOfDay: string; classId: number }>, required: number): Promise<boolean> {
    const eveningWorkouts = attendanceHistory.filter(attendance => attendance.timeOfDay === 'evening');
    return eveningWorkouts.length >= required;
  }

  private async checkConsistency(workoutHistory: Array<{ date: Date; count: number }>, requiredWeeks: number): Promise<boolean> {
    // Check if user worked out 3+ times per week for required weeks
    const weeks = new Map<string, number>();
    
    for (const workout of workoutHistory) {
      const weekKey = this.getWeekKey(workout.date);
      weeks.set(weekKey, (weeks.get(weekKey) || 0) + workout.count);
    }

    const consistentWeeks = Array.from(weeks.values()).filter(count => count >= 3).length;
    return consistentWeeks >= requiredWeeks;
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async getUserBadges(userId: number, limit?: number): Promise<UserBadge[]> {
    return await this.gamificationRepository.findUserBadges(userId, limit);
  }

  async getBadgeDefinitions(): Promise<BadgeDefinition[]> {
    return await this.gamificationRepository.findBadgeDefinitions();
  }

  // Activity tracking
  async recordActivity(userId: number, activityType: string, activityData: ActivityData): Promise<UserActivity> {
    const pointsEarned = this.calculateActivityPoints(activityType, activityData);
    
    const activity = await this.gamificationRepository.createUserActivity({
      userId,
      activityType,
      activityData,
      pointsEarned,
    });

    // Update streak if it's a workout completion
    if (activityType === 'workout_completed') {
      await this.updateUserStreak(userId, new Date());
    }

    // Check for new badges
    await this.checkAndAwardBadges(userId, activityData);

    return activity;
  }

  // Class attendance tracking - new method for attendance-based gamification
  async recordClassAttendance(userId: number, classId: number, attendanceDate: Date = new Date()): Promise<{ streak: UserStreak; newBadges: UserBadge[] }> {
    // console.log(`🎮 recordClassAttendance called for user ${userId}, class ${classId}`);
    
    // Update user streak based on class attendance
    // console.log(`📈 Updating user streak...`);
    const updatedStreak = await this.updateUserStreak(userId, attendanceDate);
    // console.log(`✅ Streak updated:`, {
    //   currentStreak: updatedStreak.currentStreak,
    //   totalPoints: updatedStreak.totalPoints,
    //   level: updatedStreak.level
    // });

    // Create activity data for badge checking
    const activityData: ActivityData = {
      classId,
      timeOfDay: this.getTimeOfDay(attendanceDate),
    };

    // Check for new badges
    // console.log(`🏆 Checking for new badges...`);
    const newBadges = await this.checkAndAwardBadges(userId, activityData);
    // console.log(`✅ Badge check complete, new badges: ${newBadges.length}`);

    // Record the attendance as an activity for tracking
    // console.log(`📝 Recording activity...`);
    await this.gamificationRepository.createUserActivity({
      userId,
      activityType: 'class_attendance',
      activityData,
      pointsEarned: this.calculateAttendancePoints(updatedStreak.currentStreak),
    });
    // console.log(`✅ Activity recorded`);

    return { streak: updatedStreak, newBadges };
  }

  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private calculateAttendancePoints(currentStreak: number): number {
    // Base points for attendance + streak bonus
    const basePoints = 10;
    const streakBonus = Math.min(currentStreak * 2, 50); // Cap streak bonus at 50 points
    return basePoints + streakBonus;
  }

  private calculateActivityPoints(activityType: string, activityData: ActivityData): number {
    switch (activityType) {
      case 'workout_completed':
        return 10 + (activityData.duration ? Math.floor(activityData.duration / 60) : 0); // 10 base + 1 per minute
      case 'streak_milestone':
        return activityData.streakDays ? activityData.streakDays * 2 : 0;
      case 'badge_earned':
        return activityData.pointsValue || 0;
      default:
        return 5; // Default points for any activity
    }
  }

  async getUserActivities(userId: number, limit?: number): Promise<UserActivity[]> {
    return await this.gamificationRepository.findUserActivities(userId, limit);
  }

  // Stats and analytics
  async getGamificationStats(userId: number): Promise<GamificationStats> {
    const userStreak = await this.gamificationRepository.findUserStreak(userId);
    const recentBadges = await this.gamificationRepository.findUserBadges(userId, 5);
    const allBadges = await this.gamificationRepository.findUserBadges(userId);
    const userWeeklyHistory = await this.gamificationRepository.getUserWeeklyWorkoutHistory(userId);


    if (!userStreak) {
      // Create initial streak if none exists
      const newStreak = await this.gamificationRepository.createUserStreak({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        totalPoints: 0,
        level: 1,
      });
      return this.buildGamificationStats(newStreak, [], 0, userWeeklyHistory);
    }

    const totalBadges = allBadges.length;

    return this.buildGamificationStats(userStreak, recentBadges, totalBadges, userWeeklyHistory);
  }

  private buildGamificationStats(
    userStreak: UserStreak,
    recentBadges: UserBadge[],
    totalBadges: number,
    weeklyHistory: Array<{ date: Date; count: number }>
  ): GamificationStats {
    const currentLevel = userStreak.level;
    const nextLevel = currentLevel + 1;
    const pointsToNext = this.getPointsToNextLevel(currentLevel);
    const pointsInCurrent = userStreak.totalPoints - this.getPointsForLevel(currentLevel - 1);
    
    // Calculate workouts this week (last 7 days)
    const workoutsThisWeek = weeklyHistory.reduce((sum, day) => sum + Number(day.count), 0);
    
    // Calculate points this week based on actual workouts completed
    const pointsThisWeek = workoutsThisWeek * 10;


    return {
      userStreak,
      recentBadges,
      totalBadges,
      levelProgress: {
        currentLevel,
        nextLevel,
        pointsToNext,
        pointsInCurrent,
      },
      weeklyStats: {
        workoutsThisWeek,
        pointsThisWeek,
        streakDays: userStreak.currentStreak,
      },
    };
  }

  calculateLevel(points: number): number {
    // Level calculation: each level requires 100 more points than the previous
    // Level 1: 0-99 points, Level 2: 100-299 points, Level 3: 300-599 points, etc.
    if (points < 100) return 1;
    return Math.floor(Math.sqrt(points / 50)) + 1;
  }

  private calculateBadgePoints(badgeDef: BadgeDefinition): number {
    // Award points based on badge rarity/difficulty
    switch (badgeDef.name) {
      case 'First Steps':
        return 25; // Easy first badge
      case 'Week Warrior':
        return 50; // 7-day streak
      case 'Month Master':
        return 100; // 30-day streak
      case 'Century Club':
        return 200; // 100 workouts
      case 'Early Bird':
        return 75; // Morning workouts
      case 'Night Owl':
        return 75; // Evening workouts
      case 'Consistency King':
        return 150; // 4 weeks consistent
      case 'Iron Will':
        return 300; // 50-day streak
      case 'Legend':
        return 500; // 365-day streak
      default:
        return 50; // Default points for unknown badges
    }
  }

  getPointsToNextLevel(currentLevel: number): number {
    const nextLevelPoints = this.getPointsForLevel(currentLevel);
    return nextLevelPoints;
  }

  private getPointsForLevel(level: number): number {
    if (level <= 1) return 100;
    return level * 100;
  }

  // Leaderboard
  async getStreakLeaderboard(limit: number = 10): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>> {
    return await this.gamificationRepository.getStreakLeaderboard(limit);
  }

  async getPointsLeaderboard(limit: number = 10): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>> {
    return await this.gamificationRepository.getPointsLeaderboard(limit);
  }
}
