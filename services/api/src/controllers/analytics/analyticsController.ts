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

  // Admin logs
  getLogs = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const logs = await this.analyticsService.getLogs(startDate, endDate);
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve logs' });
    }
  };

  // Admin summary stats
  getSummaryStats = async (req: Request, res: Response) => {
    try {
      const { period } = req.query as { period?: string };
      const stats = await this.analyticsService.getSummaryStats(period);
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve summary stats' });
    }
  };

  // Admin operations data for charts
  getOperationsData = async (req: Request, res: Response) => {
    try {
      const { period } = req.query as { period?: string };
      const operationsData = await this.analyticsService.getOperationsData(period);
      res.status(200).json(operationsData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve operations data' });
    }
  };

  // Admin user acquisition data for charts
  getUserAcquisitionData = async (req: Request, res: Response) => {
    try {
      const { period } = req.query as { period?: string };
      const acquisitionData = await this.analyticsService.getUserAcquisitionData(period);
      res.status(200).json(acquisitionData);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve user acquisition data' });
    }
  };

  /**
   * Get conversion funnel totals
   */
  getConversionFunnel = async (_req: Request, res: Response) => {
    try {
      const funnel = await this.analyticsService.getConversionFunnel();
      res.json(funnel);
    } catch (error: any) {
      console.error('getConversionFunnel error:', error);
      res.status(500).json({ error: 'Failed to fetch conversion funnel data' });
    }
  };

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

  /**
   * Get gym utilization analytics - heat map data and average utilization by hour
   */
  getGymUtilization = async (req: Request, res: Response) => {
    try {
      const { weekStartDate } = req.query as { weekStartDate?: string };
      const utilizationData = await this.analyticsService.getGymUtilization(weekStartDate);
      res.json(utilizationData);
    } catch (error: any) {
      console.error('getGymUtilization error:', error);
      res.status(500).json({ error: 'Failed to fetch gym utilization data' });
    }
  };

  /**
   * Get booking times analytics - average and most popular booking times
   */
  getBookingTimesAnalytics = async (req: Request, res: Response) => {
    try {
      const bookingTimes = await this.analyticsService.getBookingTimesAnalytics();
      res.json(bookingTimes);
    } catch (error: any) {
      console.error('getBookingTimesAnalytics error:', error);
      res.status(500).json({ error: 'Failed to fetch booking times analytics' });
    }
  };

  /**
   * Get cohort retention analytics - percentage of users retained over time
   */
  getCohortRetention = async (req: Request, res: Response) => {
    try {
      const { period } = req.query as { period?: string };
      const cohortData = await this.analyticsService.getCohortRetention(period);
      res.json(cohortData);
    } catch (error: any) {
      console.error('getCohortRetention error:', error);
      res.status(500).json({ error: 'Failed to fetch cohort retention data' });
    }
  };

}
