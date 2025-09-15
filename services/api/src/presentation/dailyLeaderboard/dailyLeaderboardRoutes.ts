import { Router } from 'express';
import { DailyLeaderboardController } from '../../controllers/dailyLeaderboard/dailyLeaderboardController';
import { DailyLeaderboardService } from '../../services/dailyLeaderboard/dailyLeaderboardService';
import { DailyLeaderboardRepository } from '../../repositories/dailyLeaderboard/dailyLeaderboardRespository';

export class DailyLeaderboardRoutes {
  private router = Router();
  private controller: DailyLeaderboardController;

  constructor() {
    const repository = new DailyLeaderboardRepository();
    const service = new DailyLeaderboardService(repository);
    this.controller = new DailyLeaderboardController(service);
    this.setupRoutes();
  }

  private setupRoutes() {
    // GET /daily-leaderboard?date=2025-01-15 (optional date parameter)
    this.router.get('/daily-leaderboard', this.controller.getDailyLeaderboard);
  }

  getRouter() { 
    return this.router; 
  }
}

// Factory function for dependency injection
export const createDailyLeaderboardRoutes = () => new DailyLeaderboardRoutes();