import express from 'express';
import { AuthController } from '../../controllers/auth/authController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

/**
 * AuthRoutes - Presentation Layer
 * Handles routing and connects HTTP requests to controllers
 */
export class AuthRoutes {
  private router: express.Router;
  private authController: AuthController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = express.Router();
    this.authController = new AuthController();
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Register route
    this.router.post('/register', this.authController.register);

    // Login route
    this.router.post('/login', this.authController.login);

    // Refresh route
    this.router.post('/refresh', this.authController.refresh);

    // Status route (requires authentication)
    this.router.get('/status', this.authMiddleware.isAuthenticated, this.authController.getStatus);

    // ME route
    this.router.get('/me', this.authMiddleware.isAuthenticated, this.authController.getMe);

    // Password change route (requires authentication)
    this.router.post('/change-password', this.authMiddleware.isAuthenticated, this.authController.changePassword);

    // MFA routes (require authentication)
    this.router.get('/mfa/status', this.authMiddleware.isAuthenticated, this.authController.getMfaStatus);
    this.router.post('/mfa/generate-secret', this.authMiddleware.isAuthenticated, this.authController.generateMfaSecret);
    this.router.post('/mfa/enable', this.authMiddleware.isAuthenticated, this.authController.enableMfa);
    this.router.post('/mfa/disable', this.authMiddleware.isAuthenticated, this.authController.disableMfa);
  }

  getRouter(): express.Router {
    return this.router;
  }
}

// Export a function to create and configure the router
export const createAuthRoutes = (): express.Router => {
  const authRoutes = new AuthRoutes();
  return authRoutes.getRouter();
};
