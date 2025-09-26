import { Router } from 'express';
import { GamificationController } from '../../controllers/gamification/gamificationController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class GamificationRoutes {
  private router: Router;
  private gamificationController: GamificationController;
  private authMiddleware: AuthMiddleware;

  constructor(gamificationController: GamificationController) {
    this.router = Router();
    this.gamificationController = gamificationController;
    this.authMiddleware = new AuthMiddleware();
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

    // User-specific gamification data (authentication required)
    this.router.get('/stats', this.authMiddleware.isAuthenticated, (req, res) => 
      this.gamificationController.getGamificationStats(req, res)
    );
    this.router.get('/streak', this.authMiddleware.isAuthenticated, (req, res) => 
      this.gamificationController.getUserStreak(req, res)
    );
    this.router.get('/badges', this.authMiddleware.isAuthenticated, (req, res) => 
      this.gamificationController.getUserBadges(req, res)
    );
    this.router.get('/activities', this.authMiddleware.isAuthenticated, (req, res) => 
      this.gamificationController.getUserActivities(req, res)
    );

    // Activity recording (authentication required)
    this.router.post('/activity', this.authMiddleware.isAuthenticated, (req, res) => 
      this.gamificationController.recordActivity(req, res)
    );
    this.router.post('/workout-completed', this.authMiddleware.isAuthenticated, (req, res) => 
      this.gamificationController.recordWorkoutCompletion(req, res)
    );

    this.router.get(
      '/character', this.authMiddleware.isAuthenticated, (req, res) => this.gamificationController.getCharacterLevel(req, res)
    );

  }

  public getRouter(): Router {
    return this.router;
  }
}
