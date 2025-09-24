export interface BadgeDefinition {
  badgeId: number;
  name: string;
  description: string;
  iconName: string;
  badgeType: 'streak' | 'attendance' | 'achievement' | 'milestone' | 'special';
  criteria: Record<string, any>;
  pointsValue: number;
  isActive: boolean;
  createdAt?: string;
}

export interface UserBadge {
  userBadgeId: number;
  userId: number;
  badgeId: number;
  earnedAt: string;
  isDisplayed: boolean;
  badge?: BadgeDefinition;
}

export interface UserStreak {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  streakStartDate?: string;
  totalWorkouts: number;
  totalPoints: number;
  level: number;
  updatedAt?: string;
}

export interface UserActivity {
  activityId: number;
  userId: number;
  activityType: string;
  activityData?: Record<string, any>;
  pointsEarned: number;
  createdAt: string;
}

export interface LevelProgress {
  currentLevel: number;
  nextLevel: number;
  pointsToNext: number;
  pointsInCurrent: number;
}

export interface WeeklyStats {
  workoutsThisWeek: number;
  pointsThisWeek: number;
  streakDays: number;
}

export interface GamificationStats {
  userStreak: UserStreak;
  recentBadges: UserBadge[];
  totalBadges: number;
  levelProgress: LevelProgress;
  weeklyStats: WeeklyStats;
}

export interface LeaderboardEntry {
  user: {
    userId: number;
    firstName: string;
    lastName: string;
  };
  streak: UserStreak;
}

export interface ActivityData {
  classId?: number;
  workoutType?: string;
  duration?: number;
  score?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  partnerIds?: number[];
  [key: string]: any;
}

// API Response types
export interface GamificationStatsResponse {
  success: boolean;
  data: GamificationStats;
}

export interface UserBadgesResponse {
  success: boolean;
  data: UserBadge[];
}

export interface UserStreakResponse {
  success: boolean;
  data: UserStreak;
}

export interface BadgeDefinitionsResponse {
  success: boolean;
  data: BadgeDefinition[];
}

export interface UserActivitiesResponse {
  success: boolean;
  data: UserActivity[];
}

export interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
}

export interface RecordActivityResponse {
  success: boolean;
  data: UserActivity;
}

export interface WorkoutCompletionResponse {
  success: boolean;
  data: {
    activity: UserActivity;
    stats: GamificationStats;
  };
}
