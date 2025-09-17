import { Router } from 'express';
import { AnalyticsController } from '../../controllers/analytics/analyticsController';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class AnalyticsRoutes {
  private router: Router;
  private analyticsController: AnalyticsController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    const analyticsService = new AnalyticsService();
    this.analyticsController = new AnalyticsController(analyticsService);
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Coach analytics routes
    this.router.get('/coach', this.authMiddleware.isAuthenticated, this.analyticsController.getCoachAnalytics);
    
    // Member analytics routes
    this.router.get('/member', this.authMiddleware.isAuthenticated, this.analyticsController.getMemberAnalytics);
  }

  public getRouter(): Router {
    return this.router;
  }
}
