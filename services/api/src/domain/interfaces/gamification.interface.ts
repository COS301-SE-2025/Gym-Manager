import { BadgeDefinition, UserBadge, UserStreak, UserActivity, GamificationStats, ActivityData } from '../entities/gamification.entity';

export interface IGamificationService {
  // Streak management
  updateUserStreak(userId: number, activityDate: Date): Promise<UserStreak>;
  getUserStreak(userId: number): Promise<UserStreak | null>;
  resetUserStreak(userId: number): Promise<void>;
  
  // Badge management
  checkAndAwardBadges(userId: number, activityData: ActivityData): Promise<UserBadge[]>;
  getUserBadges(userId: number, limit?: number): Promise<UserBadge[]>;
  getBadgeDefinitions(): Promise<BadgeDefinition[]>;
  
  // Activity tracking
  recordActivity(userId: number, activityType: string, activityData: ActivityData): Promise<UserActivity>;
  getUserActivities(userId: number, limit?: number): Promise<UserActivity[]>;
  
  // Class attendance tracking
  recordClassAttendance(userId: number, classId: number, attendanceDate?: Date): Promise<{ streak: UserStreak; newBadges: UserBadge[] }>;
  
  // Stats and analytics
  getGamificationStats(userId: number): Promise<GamificationStats>;
  calculateLevel(points: number): number;
  getPointsToNextLevel(currentLevel: number): number;
  
  // Leaderboard
  getStreakLeaderboard(limit?: number): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>>;
  getPointsLeaderboard(limit?: number): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>>;
}

export interface IGamificationRepository {
  // Streak operations
  findUserStreak(userId: number): Promise<UserStreak | null>;
  createUserStreak(userStreak: Omit<UserStreak, 'updatedAt'>): Promise<UserStreak>;
  updateUserStreak(userId: number, updates: Partial<UserStreak>): Promise<UserStreak>;
  
  // Badge operations
  findUserBadges(userId: number, limit?: number): Promise<UserBadge[]>;
  findUserBadge(userId: number, badgeId: number): Promise<UserBadge | null>;
  createUserBadge(userBadge: Omit<UserBadge, 'userBadgeId' | 'earnedAt'>): Promise<UserBadge>;
  findBadgeDefinitions(): Promise<BadgeDefinition[]>;
  findBadgeDefinition(badgeId: number): Promise<BadgeDefinition | null>;
  
  // Activity operations
  createUserActivity(activity: Omit<UserActivity, 'activityId' | 'createdAt'>): Promise<UserActivity>;
  findUserActivities(userId: number, limit?: number): Promise<UserActivity[]>;
  
  // Analytics queries
  getStreakLeaderboard(limit?: number): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>>;
  getPointsLeaderboard(limit?: number): Promise<Array<{ user: { userId: number; firstName: string; lastName: string }; streak: UserStreak }>>;
  getUserWorkoutCount(userId: number, startDate?: Date, endDate?: Date): Promise<number>;
  getUserWorkoutHistory(userId: number, days?: number): Promise<Array<{ date: Date; count: number }>>;
  getUserClassAttendanceHistory(userId: number, days?: number): Promise<Array<{ date: Date; timeOfDay: string; classId: number }>>;
}
