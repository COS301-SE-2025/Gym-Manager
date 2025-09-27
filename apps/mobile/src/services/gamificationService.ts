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
    // Use the same level calculation as backend
    const actualCurrentLevel = this.calculateLevel(totalPoints);
    const nextLevel = actualCurrentLevel + 1;
    
    // Calculate points needed for current and next level
    const pointsForCurrentLevel = this.getPointsRequiredForLevel(actualCurrentLevel);
    const pointsForNextLevel = this.getPointsRequiredForLevel(nextLevel);
    
    const pointsInCurrent = totalPoints - pointsForCurrentLevel;
    const pointsToNext = Math.max(0, pointsForNextLevel - totalPoints);
    const levelRange = pointsForNextLevel - pointsForCurrentLevel;
    const progressPercentage = levelRange > 0 ? Math.min(100, (pointsInCurrent / levelRange) * 100) : 100;

    // Debug logging
    console.log('Level Progress Debug:', {
      totalPoints,
      actualCurrentLevel,
      nextLevel,
      pointsForCurrentLevel,
      pointsForNextLevel,
      pointsInCurrent,
      pointsToNext,
      levelRange,
      progressPercentage,
      backendLevel: currentLevel // The level from backend
    });

    return {
      currentLevel: actualCurrentLevel,
      nextLevel,
      pointsToNext,
      pointsInCurrent,
      progressPercentage,
    };
  }

  private getPointsForLevel(level: number): number {
    if (level <= 0) return 0;
    if (level === 1) return 0; // Level 1 starts at 0 points
    // Match backend calculation: Math.floor(Math.sqrt(points / 50)) + 1
    // Reverse the formula: points = ((level - 1) * 50)^2
    return Math.pow((level - 1) * 50, 2);
  }

  // Use a more reasonable level calculation that matches the UI expectations
  calculateLevel(points: number): number {
    if (points < 100) return 1;
    if (points < 300) return 2;
    if (points < 600) return 3;
    if (points < 1000) return 4;
    if (points < 1500) return 5;
    if (points < 2100) return 6;
    if (points < 2800) return 7;
    if (points < 3600) return 8;
    if (points < 4500) return 9;
    if (points < 5500) return 10;
    // For very high points, use a more reasonable progression
    return Math.min(50, Math.floor(points / 1000) + 1);
  }

  // Helper method to get points required to reach a specific level
  getPointsRequiredForLevel(level: number): number {
    if (level <= 0) return 0;
    if (level === 1) return 0;
    if (level === 2) return 100;
    if (level === 3) return 300;
    if (level === 4) return 600;
    if (level === 5) return 1000;
    if (level === 6) return 1500;
    if (level === 7) return 2100;
    if (level === 8) return 2800;
    if (level === 9) return 3600;
    if (level === 10) return 4500;
    // For higher levels, use the formula: (level - 1) * 500
    return (level - 1) * 500;
  }

  getStreakEmoji(streak: number): string {
    return ''; // No emoji
  }

  getBadgeIcon(badgeType: string, badgeName?: string): string {
    // Create a comprehensive mapping of specific badge names to unique icons
    if (badgeName) {
      const name = badgeName.toLowerCase().trim();
      
      // Specific badge name mappings for unique icons
      const specificBadgeIcons: Record<string, string> = {
        // Streak badges
        'first streak': 'sparkles',
        '3 day streak': 'flame',
        '7 day streak': 'flash',
        '14 day streak': 'thunderstorm',
        '30 day streak': 'nuclear',
        '100 day streak': 'infinite',
        'streak master': 'lightning',
        'streak champion': 'bolt',
        
        // Attendance badges
        'first class': 'person-add',
        'welcome aboard': 'hand-left',
        'regular attendee': 'checkmark-circle',
        'consistent member': 'checkmark-done',
        'consistency king': 'repeat',
        'class regular': 'calendar',
        'attendance champion': 'people',
        'never miss': 'time',
        'dedicated member': 'heart',
        
        // Achievement badges
        'perfect score': 'star',
        'challenge accepted': 'shield',
        'achievement unlocked': 'ribbon',
        'goal crusher': 'trophy',
        'overachiever': 'medal',
        'excellence': 'award',
        'master performer': 'diamond',
        'legendary': 'crown',
        
        // Milestone badges
        'beginner': 'play-circle',
        'getting started': 'rocket',
        'level up': 'trending-up',
        'intermediate': 'arrow-up',
        'advanced': 'trophy',
        'expert': 'star-half',
        'master': 'diamond',
        'grandmaster': 'crown',
        'comeback kid': 'refresh',
        
        // Workout type badges
        'cardio king': 'fitness',
        'strength warrior': 'barbell',
        'yoga master': 'leaf',
        'flexibility guru': 'flower',
        'endurance beast': 'flash',
        'power lifter': 'battery-charging',
        'speed demon': 'speedometer',
        'balance master': 'balance',
        
        // Time-based badges
        'early bird': 'sunny',
        'morning warrior': 'sunrise',
        'night owl': 'moon',
        'late night hero': 'moon',
        'weekend warrior': 'cafe',
        'dawn patrol': 'partly-sunny',
        'midnight runner': 'cloudy-night',
        
        // Special achievement badges
        'perfect attendance': 'checkmark-done-circle',
        'century club': 'trophy',
        'iron will': 'barbell',
        'unstoppable': 'flash',
        'phenomenal': 'sparkles',
        'incredible': 'star',
        'amazing': 'heart',
        'outstanding': 'trophy',
        'exceptional': 'diamond',
        'extraordinary': 'crown',
        
        // Social badges
        'team player': 'people',
        'social butterfly': 'chatbubbles',
        'motivator': 'megaphone',
        'inspiration': 'bulb',
        'mentor': 'school',
        'leader': 'flag',
        'champion': 'trophy',
        'hero': 'shield',
        'legend': 'star',
        
        // Special event badges
        'holiday hero': 'gift',
        'new year warrior': 'calendar',
        'summer champion': 'sunny',
        'winter warrior': 'snow',
        'spring starter': 'flower',
        'autumn achiever': 'leaf',
        
        // Difficulty badges
        'easy does it': 'checkmark',
        'getting stronger': 'trending-up',
        'challenging': 'flame',
        'extreme': 'flash',
        'impossible': 'diamond',
        'legendary': 'crown',
        
        // Frequency badges
        'daily warrior': 'calendar',
        'weekly hero': 'time',
        'monthly master': 'calendar-outline',
        'yearly legend': 'trophy',
        
        // Performance badges
        'personal best': 'trending-up',
        'record breaker': 'flash',
        'speed demon': 'speedometer',
        'endurance king': 'battery-charging',
        'strength master': 'barbell',
        'flexibility guru': 'flower',
        
        // Special recognition
        'coach favorite': 'heart',
        'member of the month': 'star',
        'gym legend': 'trophy',
        'inspiration to all': 'bulb',
        'role model': 'school',
        'gym ambassador': 'flag',
      };
      
      // Check for exact matches first
      if (specificBadgeIcons[name]) {
        return specificBadgeIcons[name];
      }
      
      // Check for partial matches
      for (const [badgeKey, icon] of Object.entries(specificBadgeIcons)) {
        if (name.includes(badgeKey) || badgeKey.includes(name)) {
          return icon;
        }
      }
    }
    
    // Fallback to badge type icons
    const iconMap: Record<string, string> = {
      'streak': 'flash',
      'attendance': 'checkmark-circle',
      'achievement': 'ribbon',
      'milestone': 'rocket',
      'special': 'diamond',
    };
    
    return iconMap[badgeType] || 'medal';
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
  
  async getCharacter(): Promise<{ level: 1|2|3|4|5; workoutsAttended: number }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { level: 1|2|3|4|5; workoutsAttended: number } }>(
        `${this.baseUrl}/character`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching character progress:', error);
      throw error;
    }
  }


}

// Export singleton instance
export const gamificationService = new GamificationService();
