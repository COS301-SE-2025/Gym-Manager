import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { AnalyticsService } from '../../services/analytics/analyticsService';

/**
 * AnalyticsController - Controller Layer
 * Handles HTTP requests/responses for analytics data
 */
export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor(analyticsService?: AnalyticsService) {
    this.analyticsService = analyticsService || new AnalyticsService();
  }

  /**
   * Get coach analytics - average class attendance and workout popularity
   */
  getCoachAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const coachId = req.user.userId;

    try {
      const analytics = await this.analyticsService.getCoachAnalytics(coachId);
      res.json(analytics);
    } catch (error: any) {
      console.error('getCoachAnalytics error:', error);
      res.status(500).json({ error: 'Failed to fetch coach analytics' });
    }
  };

  /**
   * Get member analytics - average performance on leaderboard
   */
  getMemberAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const memberId = req.user.userId;

    try {
      const analytics = await this.analyticsService.getMemberAnalytics(memberId);
      res.json(analytics);
    } catch (error: any) {
      console.error('getMemberAnalytics error:', error);
      res.status(500).json({ error: 'Failed to fetch member analytics' });
    }
  };
}
