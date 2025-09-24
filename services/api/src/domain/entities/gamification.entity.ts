export interface BadgeDefinition {
  badgeId: number;
  name: string;
  description: string;
  iconName: string;
  badgeType: 'streak' | 'attendance' | 'achievement' | 'milestone' | 'special';
  criteria: Record<string, any>;
  pointsValue: number;
  isActive: boolean;
  createdAt?: Date;
}

export interface UserBadge {
  userBadgeId: number;
  userId: number;
  badgeId: number;
  earnedAt: Date;
  isDisplayed: boolean;
  badge?: BadgeDefinition;
}

export interface UserStreak {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
  streakStartDate?: Date;
  totalWorkouts: number;
  totalPoints: number;
  level: number;
  updatedAt?: Date;
}

export interface UserActivity {
  activityId: number;
  userId: number;
  activityType: string;
  activityData?: Record<string, any>;
  pointsEarned: number;
  createdAt: Date;
}

export interface GamificationStats {
  userStreak: UserStreak;
  recentBadges: UserBadge[];
  totalBadges: number;
  levelProgress: {
    currentLevel: number;
    nextLevel: number;
    pointsToNext: number;
    pointsInCurrent: number;
  };
  weeklyStats: {
    workoutsThisWeek: number;
    pointsThisWeek: number;
    streakDays: number;
  };
}

export interface BadgeCriteria {
  workouts_completed?: number;
  streak_days?: number;
  total_workouts?: number;
  morning_workouts?: number;
  evening_workouts?: number;
  weeks_consistent?: number;
  unique_workout_partners?: number;
  break_days?: number;
  perfect_weeks?: number;
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
