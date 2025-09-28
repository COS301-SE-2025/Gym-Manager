import { Router } from 'express';
import { PaymentPackagesController } from '../../controllers/paymentPackages/paymentPackagesController';
import { PaymentPackagesService } from '../../services/paymentPackages/paymentPackagesService';
import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';

export class PaymentPackagesRoutes {
  private router: Router;
  private paymentPackagesController: PaymentPackagesController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.router = Router();
    const paymentPackagesService = new PaymentPackagesService();
    this.paymentPackagesController = new PaymentPackagesController(paymentPackagesService);
    this.authMiddleware = new AuthMiddleware();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Public routes (no authentication required)
    this.router.get('/packages', this.paymentPackagesController.getActivePackages);

    // Authenticated routes
    this.router.get(
      '/packages/all',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.getAllPackages,
    );
    this.router.post(
      '/packages',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.createPackage,
    );
    this.router.put(
      '/packages/:packageId',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.updatePackage,
    );
    this.router.delete(
      '/packages/:packageId',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.deletePackage,
    );

    // Transaction routes
    this.router.post(
      '/transactions',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.createTransaction,
    );
    this.router.put(
      '/transactions/:transactionId/status',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.updateTransactionStatus,
    );
    this.router.get(
      '/transactions',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.getMemberTransactions,
    );

    // Financial analytics routes (admin only)
    this.router.get(
      '/analytics',
      this.authMiddleware.isAuthenticated,
      this.paymentPackagesController.getFinancialAnalytics,
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
