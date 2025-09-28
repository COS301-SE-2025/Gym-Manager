import express from 'express';
import { ClassController } from '../../controllers/class/classController';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

/**
 * ClassRoutes - Presentation Layer
 * Handles routing and connects HTTP requests to controllers
 */
export class ClassRoutes {
  private router: express.Router;
  private classController: ClassController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = express.Router();
    this.classController = new ClassController();
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Coach routes (require authentication)
    this.router.get(
      '/coach/assigned',
      this.authMiddleware.isAuthenticated,
      this.classController.getCoachAssignedClasses,
    );
    this.router.get(
      '/coach/classes-with-workouts',
      this.authMiddleware.isAuthenticated,
      this.classController.getCoachClassesWithWorkouts,
    );
    this.router.post(
      '/coach/assign-workout',
      this.authMiddleware.isAuthenticated,
      this.classController.assignWorkoutToClass,
    );
    this.router.post(
      '/coach/create-workout',
      this.authMiddleware.isAuthenticated,
      this.classController.createWorkout,
    );
    this.router.put(
      '/coach/update-workout/:workoutId',
      this.authMiddleware.isAuthenticated,
      this.classController.updateWorkout,
    );

    // Member routes (require authentication)
    this.router.get(
      '/classes',
      this.authMiddleware.isAuthenticated,
      this.classController.getAllClasses,
    );
    this.router.get(
      '/member/classes',
      this.authMiddleware.isAuthenticated,
      this.classController.getMemberClasses,
    );
    this.router.get(
      '/member/unbookedclasses',
      this.authMiddleware.isAuthenticated,
      this.classController.getMemberUnbookedClasses,
    );
    this.router.post('/book', this.authMiddleware.isAuthenticated, this.classController.bookClass);

    // General routes (no authentication required)
    this.router.post('/checkin', this.classController.checkInToClass);

    // Require authentication for cancellation so we can infer memberId from token
    this.router.post(
      '/cancel',
      this.authMiddleware.isAuthenticated,
      this.classController.cancelBooking,
    );
  }

  getRouter(): express.Router {
    return this.router;
  }
}

// Export a function to create and configure the router
export const createClassRoutes = (): express.Router => {
  const classRoutes = new ClassRoutes();
  return classRoutes.getRouter();
};
