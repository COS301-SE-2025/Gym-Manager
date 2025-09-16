import { Router } from 'express';
import { AnalyticsController } from '../../controllers/analytics/analyticsController';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { authenticateToken } from '../../infrastructure/middleware/authMiddleware';

export class AnalyticsRoutes {
  private router: Router;
  private analyticsController: AnalyticsController;

  constructor() {
    this.router = Router();
    const analyticsService = new AnalyticsService();
    this.analyticsController = new AnalyticsController(analyticsService);
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Coach analytics routes
    this.router.get('/coach', authenticateToken, this.analyticsController.getCoachAnalytics);
    
    // Member analytics routes
    this.router.get('/member', authenticateToken, this.analyticsController.getMemberAnalytics);
  }

  public getRouter(): Router {
    return this.router;
  }
}
