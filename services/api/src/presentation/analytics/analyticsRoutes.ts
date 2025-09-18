import { Router } from 'express';
import { AnalyticsController } from '../../controllers/analytics/analyticsController';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { AuthMiddleware, requireRole } from '../../infrastructure/middleware/authMiddleware';

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
    // Admin analytics routes
    this.router.get('/logs', this.authMiddleware.isAuthenticated, requireRole('admin'), this.analyticsController.getLogs);
    this.router.get('/summary-stats', this.authMiddleware.isAuthenticated, requireRole('admin'), this.analyticsController.getSummaryStats);
    this.router.get('/gym-utilization', this.authMiddleware.isAuthenticated, requireRole('admin'), this.analyticsController.getGymUtilization);

    // Coach analytics routes
    this.router.get('/coach', this.authMiddleware.isAuthenticated, this.analyticsController.getCoachAnalytics);
    
    // Member analytics routes
    this.router.get('/member', this.authMiddleware.isAuthenticated, this.analyticsController.getMemberAnalytics);
  }

  public getRouter(): Router {
    return this.router;
  }
}
