import express from 'express';
import { UserSettingsController } from '../../controllers/userSettings/userSettingsController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

/**
 * UserSettingsRoutes - Presentation Layer
 * Handles routing and connects HTTP requests to controllers
 */
export class UserSettingsRoutes {
  private router: express.Router;
  private userSettingsController: UserSettingsController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = express.Router();
    this.userSettingsController = new UserSettingsController();
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // User settings routes (require authentication)
    this.router.get('/user/settings', this.authMiddleware.isAuthenticated, this.userSettingsController.getUserSettings);
    this.router.post('/user/settings/visibility', this.authMiddleware.isAuthenticated, this.userSettingsController.editSettings);
  }

  getRouter(): express.Router {
    return this.router;
  }
}

// Export a function to create and configure the router
export const createUserSettingsRoutes = (): express.Router => {
  const userSettingsRoutes = new UserSettingsRoutes();
  return userSettingsRoutes.getRouter();
};
