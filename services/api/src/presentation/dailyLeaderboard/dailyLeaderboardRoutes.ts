// services/api/src/presentation/dailyLeaderboard/dailyLeaderboardRoutes.ts
import express from 'express';
import { DailyLeaderboardController } from '../../controllers/dailyLeaderboard/dailyLeaderboardController';
import { DailyLeaderboardService } from '../../services/dailyLeaderboard/dailyLeaderboardService';
import { DailyLeaderboardRepository } from '../../repositories/dailyLeaderboard/dailyLeaderboardRepository';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class DailyLeaderboardRoutes {
  private router: express.Router = express.Router();
  private controller: DailyLeaderboardController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    try {
      const repository = new DailyLeaderboardRepository();

      const service = new DailyLeaderboardService(repository);

      this.controller = new DailyLeaderboardController(service);

      this.authMiddleware = new AuthMiddleware();

      this.setupRoutes();
    } catch (error) {
      throw error;
    }
  }

  private setupRoutes() {
    // Test route to verify routing is working
    this.router.get('/daily-leaderboard-test', (req, res) => {
      res.json({
        message: 'Daily leaderboard routes are working!',
        timestamp: new Date().toISOString(),
      });
    });

    // Debug route to see all registered routes
    this.router.get('/daily-leaderboard-debug', (req, res) => {
      res.json({
        message: 'Debug route working',
        routes: [
          'GET /daily-leaderboard-test',
          'GET /daily-leaderboard-debug',
          'GET /daily-leaderboard',
        ],
        timestamp: new Date().toISOString(),
      });
    });

    // Actual route with debugging
    this.router.get(
      '/daily-leaderboard',
      (req, res, next) => {
        next();
      },
      this.authMiddleware.isAuthenticated,
      this.controller.getDailyLeaderboard,
    );
  }

  getRouter() {
    return this.router;
  }
}

// Factory function for dependency injection
export const createDailyLeaderboardRoutes = () => {
  return new DailyLeaderboardRoutes();
};
