import express from 'express';
import { AdminController } from '../../controllers/admin/adminController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

/**
 * AdminRoutes - Presentation Layer
 * Handles routing and connects HTTP requests to controllers
 */
export class AdminRoutes {
  private router: express.Router;
  private adminController: AdminController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = express.Router();
    this.adminController = new AdminController();
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Scheduling and classes
    this.router.post('/schedule/weekly', this.adminController.createWeeklySchedule);
    this.router.get('/schedule/weekly', this.adminController.getWeeklySchedule);
    this.router.post('/class', this.authMiddleware.isAuthenticated, this.adminController.createClass);
    this.router.post('/assign-coach', this.authMiddleware.isAuthenticated, this.adminController.assignCoach);

    // User management
    this.router.post('/assign-role', this.adminController.assignUserToRole);
    this.router.get('/members', this.adminController.getAllMembers);
    this.router.get('/users/role/:role', this.adminController.getUsersByRole);
    this.router.get('/users', this.adminController.getAllUsers);
    this.router.get('/users/:userId', this.adminController.getUserById);
    this.router.patch('/users/:userId', this.adminController.updateUserById);
    this.router.get('/users/:userId/roles', this.adminController.getRolesByUserId);

    // Role removal
    this.router.post('/remove-coach-role', this.adminController.removeCoachRole);
    this.router.post('/remove-member-role', this.adminController.removeMemberRole);
    this.router.post('/remove-admin-role', this.adminController.removeAdminRole);
    this.router.post('/remove-manager-role', this.adminController.removeManagerRole);
  }

  getRouter(): express.Router {
    return this.router;
  }
}

// Export a function to create and configure the router
export const createAdminRoutes = (): express.Router => {
  const adminRoutes = new AdminRoutes();
  return adminRoutes.getRouter();
};
