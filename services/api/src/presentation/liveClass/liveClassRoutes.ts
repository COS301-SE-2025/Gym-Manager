import express from 'express';
import { LiveClassController } from '../../controllers/liveClass/liveClassController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

/**
 * LiveClassRoutes - Presentation Layer
 * Handles routing and connects HTTP requests to controllers
 */
export class LiveClassRoutes {
  private router: express.Router;
  private liveClassController: LiveClassController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = express.Router();
    this.liveClassController = new LiveClassController();
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Leaderboard
    this.router.get('/leaderboard/:classId', this.liveClassController.getLeaderboard);

    // Live class management
    this.router.get('/live/class', this.authMiddleware.isAuthenticated, this.liveClassController.getLiveClass);
    this.router.get('/workout/:workoutId/steps', this.authMiddleware.isAuthenticated, this.liveClassController.getWorkoutSteps);
    this.router.post('/submitScore', this.authMiddleware.isAuthenticated, this.liveClassController.submitScore);

    // Coach live class management
    this.router.post('/coach/live/:classId/start', this.authMiddleware.isAuthenticated, this.liveClassController.startLiveClass);
    this.router.post('/coach/live/:classId/stop', this.authMiddleware.isAuthenticated, this.liveClassController.stopLiveClass);

    // Member progress
    this.router.post('/live/:classId/advance', this.authMiddleware.isAuthenticated, this.liveClassController.advanceProgress);
    this.router.post('/live/:classId/partial', this.authMiddleware.isAuthenticated, this.liveClassController.submitPartial);
    this.router.get('/live/:classId/leaderboard', this.liveClassController.getRealtimeLeaderboard);
    this.router.get('/live/:classId/me', this.authMiddleware.isAuthenticated, this.liveClassController.getMyProgress);

    // Interval workouts
    this.router.post('/live/:classId/interval/score', this.authMiddleware.isAuthenticated, this.liveClassController.postIntervalScore);
    this.router.get('/live/:classId/interval/leaderboard', this.liveClassController.getIntervalLeaderboard);
  }

  getRouter(): express.Router {
    return this.router;
  }
}

// Export a function to create and configure the router
export const createLiveClassRoutes = (): express.Router => {
  const liveClassRoutes = new LiveClassRoutes();
  return liveClassRoutes.getRouter();
};
