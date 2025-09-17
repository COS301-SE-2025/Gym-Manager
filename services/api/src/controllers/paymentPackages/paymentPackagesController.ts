import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { PaymentPackagesService } from '../../services/paymentPackages/paymentPackagesService';

/**
 * PaymentPackagesController - Controller Layer
 * Handles HTTP requests/responses for payment packages and financial analytics
 */
export class PaymentPackagesController {
  private paymentPackagesService: PaymentPackagesService;

  constructor(paymentPackagesService?: PaymentPackagesService) {
    this.paymentPackagesService = paymentPackagesService || new PaymentPackagesService();
  }

  /**
   * Get all active payment packages (public endpoint)
   */
  getActivePackages = async (req: Request, res: Response) => {
    try {
      const packages = await this.paymentPackagesService.getActivePackages();
      res.json(packages);
    } catch (error: any) {
      console.error('getActivePackages error:', error);
      res.status(500).json({ error: 'Failed to fetch payment packages' });
    }
  };

  /**
   * Get all payment packages (admin only)
   */
  getAllPackages = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const packages = await this.paymentPackagesService.getAllPackages();
      res.json(packages);
    } catch (error: any) {
      console.error('getAllPackages error:', error);
      res.status(500).json({ error: 'Failed to fetch payment packages' });
    }
  };

  /**
   * Create a new payment package (admin only)
   */
  createPackage = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, creditsAmount, priceCents, currency } = req.body;

    if (!name || !creditsAmount || !priceCents) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, creditsAmount, priceCents' 
      });
    }

    if (creditsAmount <= 0 || priceCents <= 0) {
      return res.status(400).json({ 
        error: 'creditsAmount and priceCents must be positive numbers' 
      });
    }

    try {
      const packageId = await this.paymentPackagesService.createPackage(
        req.user.userId,
        { name, description, creditsAmount, priceCents, currency }
      );
      res.status(201).json({ 
        success: true, 
        packageId,
        message: 'Payment package created successfully' 
      });
    } catch (error: any) {
      console.error('createPackage error:', error);
      res.status(500).json({ error: 'Failed to create payment package' });
    }
  };

  /**
   * Update a payment package (admin only)
   */
  updatePackage = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { packageId } = req.params;
    const updateData = req.body;

    if (!packageId || isNaN(Number(packageId))) {
      return res.status(400).json({ error: 'Invalid package ID' });
    }

    try {
      await this.paymentPackagesService.updatePackage(Number(packageId), updateData);
      res.json({ success: true, message: 'Payment package updated successfully' });
    } catch (error: any) {
      console.error('updatePackage error:', error);
      res.status(500).json({ error: 'Failed to update payment package' });
    }
  };

  /**
   * Delete a payment package (admin only)
   */
  deletePackage = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { packageId } = req.params;

    if (!packageId || isNaN(Number(packageId))) {
      return res.status(400).json({ error: 'Invalid package ID' });
    }

    try {
      await this.paymentPackagesService.deletePackage(Number(packageId));
      res.json({ success: true, message: 'Payment package deleted successfully' });
    } catch (error: any) {
      console.error('deletePackage error:', error);
      res.status(500).json({ error: 'Failed to delete payment package' });
    }
  };

  /**
   * Create a payment transaction
   */
  createTransaction = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { packageId, paymentMethod, externalTransactionId } = req.body;

    if (!packageId) {
      return res.status(400).json({ error: 'packageId is required' });
    }

    try {
      const transactionId = await this.paymentPackagesService.createTransaction({
        memberId: req.user.userId,
        packageId,
        paymentMethod,
        externalTransactionId,
      });
      res.status(201).json({ 
        success: true, 
        transactionId,
        message: 'Payment transaction created successfully' 
      });
    } catch (error: any) {
      console.error('createTransaction error:', error);
      if (error.message === 'Payment package not found') {
        return res.status(404).json({ error: 'Payment package not found' });
      }
      res.status(500).json({ error: 'Failed to create payment transaction' });
    }
  };

  /**
   * Update payment transaction status
   */
  updateTransactionStatus = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { transactionId } = req.params;
    const { status, externalTransactionId } = req.body;

    if (!transactionId || isNaN(Number(transactionId))) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    try {
      await this.paymentPackagesService.updateTransactionStatus(
        Number(transactionId),
        status,
        externalTransactionId
      );
      res.json({ success: true, message: 'Transaction status updated successfully' });
    } catch (error: any) {
      console.error('updateTransactionStatus error:', error);
      res.status(500).json({ error: 'Failed to update transaction status' });
    }
  };

  /**
   * Get financial analytics (admin only)
   */
  getFinancialAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const analytics = await this.paymentPackagesService.getFinancialAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error('getFinancialAnalytics error:', error);
      res.status(500).json({ error: 'Failed to fetch financial analytics' });
    }
  };

  /**
   * Get member's transaction history
   */
  getMemberTransactions = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const transactions = await this.paymentPackagesService.getMemberTransactions(req.user.userId);
      res.json(transactions);
    } catch (error: any) {
      console.error('getMemberTransactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
  };
}
