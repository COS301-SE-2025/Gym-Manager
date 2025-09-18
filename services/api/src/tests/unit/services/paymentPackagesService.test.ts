import { PaymentPackagesService } from '../../../services/paymentPackages/paymentPackagesService';

// Mock the database client
jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  },
}));

describe('PaymentPackagesService', () => {
  let service: PaymentPackagesService;
  let mockDb: any;

  beforeEach(() => {
    service = new PaymentPackagesService();
    mockDb = require('../../../db/client').db;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivePackages', () => {
    it('should return active payment packages', async () => {
      const mockPackages = [
        {
          packageId: 1,
          name: 'Basic Package',
          description: 'Basic credit package',
          creditsAmount: 10,
          priceCents: 1000,
          currency: 'ZAR',
          isActive: true,
          createdBy: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockPackages),
          }),
        }),
      });

      const result = await service.getActivePackages();

      expect(result).toEqual([
        {
          packageId: 1,
          name: 'Basic Package',
          description: 'Basic credit package',
          creditsAmount: 10,
          priceCents: 1000,
          currency: 'ZAR',
          isActive: true,
          createdBy: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]);
    });
  });

  describe('getAllPackages', () => {
    it('should return all packages with transaction counts', async () => {
      const mockPackages = [
        {
          packageId: 1,
          name: 'Basic Package',
          description: 'Basic credit package',
          creditsAmount: 10,
          priceCents: 1000,
          currency: 'ZAR',
          isActive: true,
          createdBy: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          transactionCount: 5,
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockPackages),
            }),
          }),
        }),
      });

      const result = await service.getAllPackages();

      expect(result).toEqual([
        {
          packageId: 1,
          name: 'Basic Package',
          description: 'Basic credit package',
          creditsAmount: 10,
          priceCents: 1000,
          currency: 'ZAR',
          isActive: true,
          createdBy: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          transactionCount: 5,
        },
      ]);
    });
  });

  describe('createPackage', () => {
    it('should create a new payment package', async () => {
      const adminId = 1;
      const packageData = {
        name: 'Premium Package',
        description: 'Premium credit package',
        creditsAmount: 50,
        priceCents: 5000,
        currency: 'USD',
      };

      const mockResult = [{ packageId: 2 }];

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockResult),
        }),
      });

      const result = await service.createPackage(adminId, packageData);

      expect(result).toBe(2);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updatePackage', () => {
    it('should update a payment package', async () => {
      const packageId = 1;
      const packageData = {
        name: 'Updated Package',
        creditsAmount: 20,
        isActive: false,
      };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await service.updatePackage(packageId, packageData);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deletePackage', () => {
    it('should delete a package with no transactions', async () => {
      const packageId = 1;

      // Mock no existing transactions
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await service.deletePackage(packageId);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw error when deleting package with existing transactions', async () => {
      const packageId = 1;

      // Mock existing transactions
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ transactionId: 1 }]),
          }),
        }),
      });

      await expect(
        service.deletePackage(packageId)
      ).rejects.toThrow('Cannot delete package: There are existing transactions using this package. Please deactivate it instead.');
    });
  });

  describe('createTransaction', () => {
    it('should create a payment transaction', async () => {
      const transactionData = {
        memberId: 1,
        packageId: 1,
        paymentMethod: 'card',
        externalTransactionId: 'ext_123',
      };

      const mockPackage = {
        packageId: 1,
        priceCents: 1000,
        creditsAmount: 10,
      };

      const mockResult = [{ transactionId: 123 }];

      // Mock package lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPackage]),
        }),
      });

      // Mock transaction creation
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockResult),
        }),
      });

      const result = await service.createTransaction(transactionData);

      expect(result).toBe(123);
    });

    it('should throw error if package not found', async () => {
      const transactionData = {
        memberId: 1,
        packageId: 999,
      };

      // Mock package not found
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.createTransaction(transactionData)
      ).rejects.toThrow('Payment package not found');
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status to completed', async () => {
      const transactionId = 123;
      const status = 'completed';
      const externalTransactionId = 'ext_123';

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await service.updateTransactionStatus(transactionId, status, externalTransactionId);

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should update transaction status without external ID', async () => {
      const transactionId = 123;
      const status = 'pending';

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await service.updateTransactionStatus(transactionId, status);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getMemberTransactions', () => {
    it('should return member transaction history', async () => {
      const memberId = 1;
      const mockTransactions = [
        {
          transactionId: 1,
          memberId: 1,
          packageId: 1,
          amountCents: 1000,
          creditsPurchased: 10,
          paymentMethod: 'card',
          paymentStatus: 'completed',
          externalTransactionId: 'ext_123',
          processedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockTransactions),
          }),
        }),
      });

      const result = await service.getMemberTransactions(memberId);

      expect(result).toEqual([
        {
          transactionId: 1,
          memberId: 1,
          packageId: 1,
          amountCents: 1000,
          creditsPurchased: 10,
          paymentMethod: 'card',
          paymentStatus: 'completed',
          externalTransactionId: 'ext_123',
          processedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]);
    });
  });

  describe('getFinancialAnalytics', () => {
    it('should return financial analytics with current and previous month data', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Mock current month revenue
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ totalRevenue: 10000 }]),
        }),
      });

      // Mock previous month revenue
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ totalRevenue: 8000 }]),
        }),
      });

      // Mock member count
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 50 }]),
        }),
      });

      // Mock LTV data
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ averageLTV: 20000, medianLTV: 18000 }]),
      });

      // Mock revenue trends
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { year: 2024, month: 1, revenue: 8000 },
              { year: 2024, month: 2, revenue: 10000 },
            ]),
          }),
        }),
      });

      const result = await service.getFinancialAnalytics();

      expect(result).toEqual({
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
        revenueTrends: [
          {
            year: 2024,
            month: 1,
            revenue: 8000,
            growth: 0,
          },
          {
            year: 2024,
            month: 2,
            revenue: 10000,
            growth: 25,
          },
        ],
      });
    });

    it('should handle zero previous revenue for growth calculation', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Mock current month revenue
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ totalRevenue: 10000 }]),
        }),
      });

      // Mock previous month revenue (zero)
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ totalRevenue: 0 }]),
        }),
      });

      // Mock member count
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 50 }]),
        }),
      });

      // Mock LTV data
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ averageLTV: 20000, medianLTV: 18000 }]),
      });

      // Mock revenue trends
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getFinancialAnalytics();

      expect(result.monthlyRecurringRevenue.growth).toBe(0);
      expect(result.averageRevenuePerUser.growth).toBe(0);
    });

    it('should handle null revenue data', async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Mock null revenue data
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ totalRevenue: null }]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ totalRevenue: null }]),
        }),
      });

      // Mock member count
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      // Mock LTV data
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ averageLTV: null, medianLTV: null }]),
      });

      // Mock revenue trends
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getFinancialAnalytics();

      expect(result.monthlyRecurringRevenue.current).toBe(0);
      expect(result.monthlyRecurringRevenue.previous).toBe(0);
      expect(result.averageRevenuePerUser.current).toBe(0);
      expect(result.lifetimeValue.average).toBe(0);
      expect(result.lifetimeValue.median).toBe(0);
    });
  });
});
