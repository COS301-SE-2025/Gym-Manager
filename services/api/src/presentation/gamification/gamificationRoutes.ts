import { Router } from 'express';
import { GamificationController } from '../../controllers/gamification/gamificationController';
import { authMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class GamificationRoutes {
  private router: Router;
  private gamificationController: GamificationController;

  constructor(gamificationController: GamificationController) {
    this.router = Router();
    this.gamificationController = gamificationController;
    this.setupRoutes();
  }

  private setupRoutes() {
    // Public routes (no authentication required)
    this.router.get('/badge-definitions', (req, res) => 
      this.gamificationController.getBadgeDefinitions(req, res)
    );
    this.router.get('/leaderboard/streak', (req, res) => 
      this.gamificationController.getStreakLeaderboard(req, res)
    );
    this.router.get('/leaderboard/points', (req, res) => 
      this.gamificationController.getPointsLeaderboard(req, res)
    );

    // Protected routes (authentication required)
    this.router.use(authMiddleware);

    // User-specific gamification data
    this.router.get('/stats', (req, res) => 
      this.gamificationController.getGamificationStats(req, res)
    );
    this.router.get('/streak', (req, res) => 
      this.gamificationController.getUserStreak(req, res)
    );
    this.router.get('/badges', (req, res) => 
      this.gamificationController.getUserBadges(req, res)
    );
    this.router.get('/activities', (req, res) => 
      this.gamificationController.getUserActivities(req, res)
    );

    // Activity recording
    this.router.post('/activity', (req, res) => 
      this.gamificationController.recordActivity(req, res)
    );
    this.router.post('/workout-completed', (req, res) => 
      this.gamificationController.recordWorkoutCompletion(req, res)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
