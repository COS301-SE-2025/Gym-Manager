import { Request, Response } from 'express';
import { IGamificationService } from '../../domain/interfaces/gamification.interface';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';

export class GamificationController {
  constructor(private gamificationService: IGamificationService) {}

  // GET /gamification/stats - Get user's gamification stats
  async getGamificationStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const stats = await this.gamificationService.getGamificationStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting gamification stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /gamification/streak - Get user's current streak
  async getUserStreak(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const streak = await this.gamificationService.getUserStreak(userId);

      res.json({
        success: true,
        data: streak,
      });
    } catch (error) {
      console.error('Error getting user streak:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /gamification/badges - Get user's badges
  async getUserBadges(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const badges = await this.gamificationService.getUserBadges(userId, limit);

      res.json({
        success: true,
        data: badges,
      });
    } catch (error) {
      console.error('Error getting user badges:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /gamification/badge-definitions - Get all available badge definitions
  async getBadgeDefinitions(req: Request, res: Response) {
    try {
      const badgeDefinitions = await this.gamificationService.getBadgeDefinitions();

      res.json({
        success: true,
        data: badgeDefinitions,
      });
    } catch (error) {
      console.error('Error getting badge definitions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /gamification/activities - Get user's recent activities
  async getUserActivities(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await this.gamificationService.getUserActivities(userId, limit);

      res.json({
        success: true,
        data: activities,
      });
    } catch (error) {
      console.error('Error getting user activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /gamification/activity - Record a new activity
  async recordActivity(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const { activityType, activityData } = req.body;

      if (!activityType) {
        return res.status(400).json({ error: 'Activity type is required' });
      }

      const activity = await this.gamificationService.recordActivity(
        userId,
        activityType,
        activityData || {}
      );

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      console.error('Error recording activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /gamification/leaderboard/streak - Get streak leaderboard
  async getStreakLeaderboard(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await this.gamificationService.getStreakLeaderboard(limit);

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      console.error('Error getting streak leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /gamification/leaderboard/points - Get points leaderboard
  async getPointsLeaderboard(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await this.gamificationService.getPointsLeaderboard(limit);

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      console.error('Error getting points leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /gamification/workout-completed - Record workout completion (convenience endpoint)
  async recordWorkoutCompletion(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const { classId, workoutType, duration, score } = req.body;

      const activityData = {
        classId,
        workoutType,
        duration,
        score,
        timeOfDay: this.getTimeOfDay(),
      };

      const activity = await this.gamificationService.recordActivity(
        userId,
        'workout_completed',
        activityData
      );

      // Get updated stats after recording activity
      const stats = await this.gamificationService.getGamificationStats(userId);

      res.json({
        success: true,
        data: {
          activity,
          stats,
        },
      });
    } catch (error) {
      console.error('Error recording workout completion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  // add this method in the class
  async getCharacterLevel(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const userId = req.user.userId;

      const data = await this.gamificationService.getCharacterLevel(userId);

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error('Error getting character level:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }


}
