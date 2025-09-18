import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { PaymentPackagesController } from '../../controllers/paymentPackages/paymentPackagesController';
import { PaymentPackagesService } from '../../services/paymentPackages/paymentPackagesService';

// Mock the PaymentPackagesService
jest.mock('../../services/paymentPackages/paymentPackagesService');

describe('PaymentPackagesController', () => {
  let controller: PaymentPackagesController;
  let mockPaymentPackagesService: jest.Mocked<PaymentPackagesService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock PaymentPackagesService
    mockPaymentPackagesService = {
      getActivePackages: jest.fn(),
      getAllPackages: jest.fn(),
      createPackage: jest.fn(),
      updatePackage: jest.fn(),
      deletePackage: jest.fn(),
      createTransaction: jest.fn(),
      updateTransactionStatus: jest.fn(),
      getMemberTransactions: jest.fn(),
      getFinancialAnalytics: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new PaymentPackagesController(mockPaymentPackagesService);

    // Create mock request and response objects
    mockRequest = {
      user: { userId: 1, roles: ['admin'] },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getActivePackages', () => {
    it('should return active payment packages', async () => {
      const expectedPackages = [
        {
          packageId: 1,
          name: 'Basic Package',
          description: 'Basic credit package',
          creditsAmount: 10,
          priceCents: 1000,
          currency: 'ZAR',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockPaymentPackagesService.getActivePackages.mockResolvedValue(expectedPackages);

      await controller.getActivePackages(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentPackagesService.getActivePackages).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(expectedPackages);
    });

    it('should handle service errors', async () => {
      mockPaymentPackagesService.getActivePackages.mockRejectedValue(new Error('Database error'));

      await controller.getActivePackages(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch payment packages' });
    });
  });

  describe('getAllPackages', () => {
    it('should return all packages for authenticated admin', async () => {
      const expectedPackages = [
        {
          packageId: 1,
          name: 'Basic Package',
          description: 'Basic credit package',
          creditsAmount: 10,
          priceCents: 1000,
          currency: 'ZAR',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockPaymentPackagesService.getAllPackages.mockResolvedValue(expectedPackages);

      await controller.getAllPackages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.getAllPackages).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(expectedPackages);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getAllPackages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockPaymentPackagesService.getAllPackages).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockPaymentPackagesService.getAllPackages.mockRejectedValue(new Error('Service error'));

      await controller.getAllPackages(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch payment packages' });
    });
  });

  describe('createPackage', () => {
    it('should create package successfully', async () => {
      const packageData = {
        name: 'Premium Package',
        description: 'Premium credit package',
        creditsAmount: 50,
        priceCents: 5000,
        currency: 'USD',
      };

      const expectedResult = { packageId: 2 };

      mockRequest.body = packageData;
      mockPaymentPackagesService.createPackage.mockResolvedValue(2);

      await controller.createPackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.createPackage).toHaveBeenCalledWith(1, packageData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        packageId: 2,
        message: 'Payment package created successfully'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { name: 'Test Package' };

      await controller.createPackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle validation errors', async () => {
      const invalidPackageData = {
        // Missing required fields
        description: 'Invalid package',
      };

      mockRequest.body = invalidPackageData;
      mockPaymentPackagesService.createPackage.mockRejectedValue(new Error('Missing required fields'));

      await controller.createPackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields: name, creditsAmount, priceCents' });
    });

    it('should handle service errors', async () => {
      const packageData = {
        name: 'Test Package',
        description: 'Test description',
        creditsAmount: 10,
        priceCents: 1000,
        currency: 'ZAR',
      };

      mockRequest.body = packageData;
      mockPaymentPackagesService.createPackage.mockRejectedValue(new Error('Database error'));

      await controller.createPackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to create payment package' });
    });
  });

  describe('updatePackage', () => {
    it('should update package successfully', async () => {
      const packageId = 1;
      const updateData = {
        name: 'Updated Package',
        creditsAmount: 20,
        isActive: false,
      };

      mockRequest.params = { packageId: packageId.toString() };
      mockRequest.body = updateData;
      mockPaymentPackagesService.updatePackage.mockResolvedValue(undefined);

      await controller.updatePackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.updatePackage).toHaveBeenCalledWith(packageId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Payment package updated successfully' });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { packageId: '1' };
      mockRequest.body = { name: 'Updated Package' };

      await controller.updatePackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle package not found error', async () => {
      const packageId = 999;
      const updateData = { name: 'Updated Package' };

      mockRequest.params = { packageId: packageId.toString() };
      mockRequest.body = updateData;
      mockPaymentPackagesService.updatePackage.mockRejectedValue(new Error('Package not found'));

      await controller.updatePackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to update payment package' });
    });
  });

  describe('deletePackage', () => {
    it('should delete package successfully', async () => {
      const packageId = 1;
      mockRequest.params = { packageId: packageId.toString() };
      mockPaymentPackagesService.deletePackage.mockResolvedValue(undefined);

      await controller.deletePackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.deletePackage).toHaveBeenCalledWith(packageId);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Payment package deleted successfully' });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { packageId: '1' };

      await controller.deletePackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle package with transactions error', async () => {
      const packageId = 1;
      mockRequest.params = { packageId: packageId.toString() };
      mockPaymentPackagesService.deletePackage.mockRejectedValue(
        new Error('Cannot delete package: There are existing transactions using this package. Please deactivate it instead.')
      );

      await controller.deletePackage(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Cannot delete package: There are existing transactions using this package. Please deactivate it instead.',
      });
    });
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      const transactionData = {
        memberId: 1,
        packageId: 1,
        paymentMethod: 'card',
        externalTransactionId: 'ext_123',
      };

      const expectedResult = { transactionId: 123 };

      mockRequest.body = transactionData;
      mockPaymentPackagesService.createTransaction.mockResolvedValue(123);

      await controller.createTransaction(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.createTransaction).toHaveBeenCalledWith(transactionData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        transactionId: 123,
        message: 'Payment transaction created successfully'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { memberId: 1, packageId: 1 };

      await controller.createTransaction(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle package not found error', async () => {
      const transactionData = {
        memberId: 1,
        packageId: 999,
      };

      mockRequest.body = transactionData;
      mockPaymentPackagesService.createTransaction.mockRejectedValue(new Error('Payment package not found'));

      await controller.createTransaction(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Payment package not found' });
    });
  });

  describe('getMemberTransactions', () => {
    it('should return member transactions for authenticated user', async () => {
      const memberId = 1;
      const expectedTransactions = [
        {
          transactionId: 1,
          memberId: 1,
          packageId: 1,
          amountCents: 1000,
          creditsPurchased: 10,
          paymentMethod: 'card',
          paymentStatus: 'completed',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockRequest.params = { memberId: memberId.toString() };
      mockPaymentPackagesService.getMemberTransactions.mockResolvedValue(expectedTransactions);

      await controller.getMemberTransactions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.getMemberTransactions).toHaveBeenCalledWith(memberId);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedTransactions);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { memberId: '1' };

      await controller.getMemberTransactions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      const memberId = 1;
      mockRequest.params = { memberId: memberId.toString() };
      mockPaymentPackagesService.getMemberTransactions.mockRejectedValue(new Error('Service error'));

      await controller.getMemberTransactions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch transaction history' });
    });
  });

  describe('getFinancialAnalytics', () => {
    it('should return financial analytics for authenticated admin', async () => {
      const expectedAnalytics = {
        monthlyRecurringRevenue: {
          current: 10000,
          previous: 8000,
          growth: 25,
        },
        averageRevenuePerUser: {
          current: 200,
          previous: 160,
          growth: 25,
        },
        lifetimeValue: {
          average: 20000,
          median: 18000,
        },
        revenueTrends: [],
      };

      mockPaymentPackagesService.getFinancialAnalytics.mockResolvedValue(expectedAnalytics);

      await controller.getFinancialAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockPaymentPackagesService.getFinancialAnalytics).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(expectedAnalytics);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getFinancialAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      mockPaymentPackagesService.getFinancialAnalytics.mockRejectedValue(new Error('Service error'));

      await controller.getFinancialAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch financial analytics' });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = new PaymentPackagesService();
      const controller = new PaymentPackagesController(customService);
      expect(controller).toBeInstanceOf(PaymentPackagesController);
    });

    it('should create controller with default service when none provided', () => {
      const controller = new PaymentPackagesController();
      expect(controller).toBeInstanceOf(PaymentPackagesController);
    });
  });
});
