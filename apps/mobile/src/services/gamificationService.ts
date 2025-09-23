import { apiClient } from '../utils/apiClient';
import {
  GamificationStats,
  UserBadge,
  UserStreak,
  UserActivity,
  BadgeDefinition,
  LeaderboardEntry,
  ActivityData,
  GamificationStatsResponse,
  UserBadgesResponse,
  UserStreakResponse,
  BadgeDefinitionsResponse,
  UserActivitiesResponse,
  LeaderboardResponse,
  RecordActivityResponse,
  WorkoutCompletionResponse,
} from '../types/gamification';

export class GamificationService {
  private baseUrl = '/gamification';

  // Get user's complete gamification stats
  async getGamificationStats(): Promise<GamificationStats> {
    try {
      const response = await apiClient.get<GamificationStatsResponse>(`${this.baseUrl}/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching gamification stats:', error);
      throw error;
    }
  }

  // Get user's current streak
  async getUserStreak(): Promise<UserStreak> {
    try {
      const response = await apiClient.get<UserStreakResponse>(`${this.baseUrl}/streak`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user streak:', error);
      throw error;
    }
  }

  // Get user's badges
  async getUserBadges(limit?: number): Promise<UserBadge[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get<UserBadgesResponse>(`${this.baseUrl}/badges`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user badges:', error);
      throw error;
    }
  }

  // Get all available badge definitions
  async getBadgeDefinitions(): Promise<BadgeDefinition[]> {
    try {
      const response = await apiClient.get<BadgeDefinitionsResponse>(`${this.baseUrl}/badge-definitions`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching badge definitions:', error);
      throw error;
    }
  }

  // Get user's recent activities
  async getUserActivities(limit?: number): Promise<UserActivity[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get<UserActivitiesResponse>(`${this.baseUrl}/activities`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  }

  // Record a new activity
  async recordActivity(activityType: string, activityData?: ActivityData): Promise<UserActivity> {
    try {
      const response = await apiClient.post<RecordActivityResponse>(`${this.baseUrl}/activity`, {
        activityType,
        activityData: activityData || {},
      });
      return response.data.data;
    } catch (error) {
      console.error('Error recording activity:', error);
      throw error;
    }
  }

  // Record workout completion (convenience method)
  async recordWorkoutCompletion(workoutData: {
    classId?: number;
    workoutType?: string;
    duration?: number;
    score?: number;
  }): Promise<{ activity: UserActivity; stats: GamificationStats }> {
    try {
      const response = await apiClient.post<WorkoutCompletionResponse>(`${this.baseUrl}/workout-completed`, workoutData);
      return response.data.data;
    } catch (error) {
      console.error('Error recording workout completion:', error);
      throw error;
    }
  }

  // Get streak leaderboard
  async getStreakLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get<LeaderboardResponse>(`${this.baseUrl}/leaderboard/streak`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching streak leaderboard:', error);
      throw error;
    }
  }

  // Get points leaderboard
  async getPointsLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    try {
      const params = limit ? { limit } : {};
      const response = await apiClient.get<LeaderboardResponse>(`${this.baseUrl}/leaderboard/points`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching points leaderboard:', error);
      throw error;
    }
  }

  // Utility methods for UI
  getLevelProgress(currentLevel: number, totalPoints: number): {
    currentLevel: number;
    nextLevel: number;
    pointsToNext: number;
    pointsInCurrent: number;
    progressPercentage: number;
  } {
    const pointsForCurrentLevel = this.getPointsForLevel(currentLevel - 1);
    const pointsForNextLevel = this.getPointsForLevel(currentLevel);
    const pointsInCurrent = totalPoints - pointsForCurrentLevel;
    const pointsToNext = pointsForNextLevel - totalPoints;
    const progressPercentage = Math.min(100, (pointsInCurrent / (pointsForNextLevel - pointsForCurrentLevel)) * 100);

    return {
      currentLevel,
      nextLevel: currentLevel + 1,
      pointsToNext,
      pointsInCurrent,
      progressPercentage,
    };
  }

  private getPointsForLevel(level: number): number {
    if (level <= 1) return 100;
    return level * 100;
  }

  getStreakEmoji(streak: number): string {
    return ''; // No emoji
  }

  getBadgeIcon(badgeType: string): string {
    return ''; // No emoji
  }

  formatStreakText(streak: number): string {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return '1 day streak';
    return `${streak} day streak`;
  }

  formatPointsText(points: number): string {
    if (points < 1000) return `${points} pts`;
    return `${(points / 1000).toFixed(1)}k pts`;
  }
}

// Export singleton instance
export const gamificationService = new GamificationService();
