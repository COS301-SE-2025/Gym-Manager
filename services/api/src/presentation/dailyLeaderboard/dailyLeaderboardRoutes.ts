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
    console.log('🔵 DailyLeaderboardRoutes: Constructor starting...');
    
    try {
      console.log('🔵 DailyLeaderboardRoutes: Creating repository...');
      const repository = new DailyLeaderboardRepository();
      
      console.log('🔵 DailyLeaderboardRoutes: Creating service...');
      const service = new DailyLeaderboardService(repository);
      
      console.log('🔵 DailyLeaderboardRoutes: Creating controller...');
      this.controller = new DailyLeaderboardController(service);
      
      console.log('🔵 DailyLeaderboardRoutes: Creating auth middleware...');
      this.authMiddleware = new AuthMiddleware();
      
      console.log('🔵 DailyLeaderboardRoutes: Setting up routes...');
      this.setupRoutes();
      
      console.log('✅ DailyLeaderboardRoutes: Constructor completed successfully!');
    } catch (error) {
      console.error('❌ DailyLeaderboardRoutes: Constructor failed:', error);
      throw error;
    }
  }

  private setupRoutes() {
    console.log('🔵 DailyLeaderboardRoutes: Setting up routes...');
    
    // Test route to verify routing is working
    this.router.get('/daily-leaderboard-test', (req, res) => {
      console.log('🟢 Test route hit: /daily-leaderboard-test');
      res.json({ 
        message: 'Daily leaderboard routes are working!', 
        timestamp: new Date().toISOString() 
      });
    });

    // Debug route to see all registered routes
    this.router.get('/daily-leaderboard-debug', (req, res) => {
      console.log('🟢 Debug route hit: /daily-leaderboard-debug');
      res.json({
        message: 'Debug route working',
        routes: ['GET /daily-leaderboard-test', 'GET /daily-leaderboard-debug', 'GET /daily-leaderboard'],
        timestamp: new Date().toISOString()
      });
    });

    // Actual route with debugging
    this.router.get('/daily-leaderboard', (req, res, next) => {
      console.log('🟢 Daily leaderboard route hit: /daily-leaderboard');
      console.log('🟢 Request query:', req.query);
      console.log('🟢 Request headers:', req.headers);
      next();
    }, this.authMiddleware.isAuthenticated, this.controller.getDailyLeaderboard);

    console.log('✅ DailyLeaderboardRoutes: Routes setup completed');
  }

  getRouter() { 
    console.log('🔵 DailyLeaderboardRoutes: getRouter() called');
    return this.router; 
  }
}

// Factory function for dependency injection
export const createDailyLeaderboardRoutes = () => {
  console.log('🔵 createDailyLeaderboardRoutes: Factory function called');
  return new DailyLeaderboardRoutes();
};