import express from 'express';
import { HealthController } from '../../controllers/health/healthController';

/**
 * HealthRoutes - Presentation Layer
 * Handles routing and connects HTTP requests to controllers
 */
export class HealthRoutes {
  private router: express.Router;
  private healthController: HealthController;

  constructor() {
    this.router = express.Router();
    this.healthController = new HealthController();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check route (no authentication required)
    this.router.get('/health', this.healthController.healthCheck);
  }

  getRouter(): express.Router {
    return this.router;
  }
}

// Export a function to create and configure the router
export const createHealthRoutes = (): express.Router => {
  const healthRoutes = new HealthRoutes();
  return healthRoutes.getRouter();
};
