import { Request, Response } from 'express';
import { MemberController } from '../../controllers/member/memberController';
import { MemberService } from '../../services/member/memberService';

// Mock the MemberService
jest.mock('../../services/member/memberService');

describe('MemberController', () => {
  let controller: MemberController;
  let mockMemberService: jest.Mocked<MemberService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock MemberService
    mockMemberService = {
      getCreditsBalance: jest.fn(),
      purchaseCredits: jest.fn(),
      getMemberProfile: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new MemberController(mockMemberService);

    // Create mock request and response objects
    mockRequest = {
      params: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getCredits', () => {
    it('should return member credits balance', async () => {
      const userId = 1;
      const expectedCredits = 25;

      mockRequest.params = { userId: userId.toString() };
      mockMemberService.getCreditsBalance.mockResolvedValue(expectedCredits);

      await controller.getCredits(mockRequest as Request, mockResponse as Response);

      expect(mockMemberService.getCreditsBalance).toHaveBeenCalledWith(userId);
      expect(mockResponse.json).toHaveBeenCalledWith({ creditsBalance: expectedCredits });
    });

    it('should handle invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid' };

      await controller.getCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid user ID' });
      expect(mockMemberService.getCreditsBalance).not.toHaveBeenCalled();
    });

    it('should handle member not found error', async () => {
      const userId = 999;

      mockRequest.params = { userId: userId.toString() };
      mockMemberService.getCreditsBalance.mockRejectedValue(new Error('Member not found'));

      await controller.getCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Member not found' });
    });

    it('should handle generic service errors', async () => {
      const userId = 1;

      mockRequest.params = { userId: userId.toString() };
      mockMemberService.getCreditsBalance.mockRejectedValue(new Error('Database error'));

      await controller.getCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to get credits balance' });
    });
  });

  describe('purchaseCredits', () => {
    it('should purchase credits successfully', async () => {
      const userId = 1;
      const purchaseData = {
        credits: 10,
        amount: 1000,
        paymentMethod: 'card',
        transactionId: 'txn_123',
      };

      const expectedResult = { newBalance: 35, creditsAdded: 10, transactionId: 'txn_123' };

      mockRequest.params = { userId: userId.toString() };
      mockRequest.body = purchaseData;
      mockMemberService.purchaseCredits.mockResolvedValue(expectedResult);

      await controller.purchaseCredits(mockRequest as Request, mockResponse as Response);

      expect(mockMemberService.purchaseCredits).toHaveBeenCalledWith(
        userId,
        purchaseData.credits,
        purchaseData.amount,
        purchaseData.paymentMethod,
        purchaseData.transactionId
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        newBalance: 35,
        creditsAdded: 10,
        transactionId: 'txn_123',
        message: 'Successfully added 10 credits to your account'
      });
    });

    it('should handle invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid' };
      mockRequest.body = { credits: 10, amount: 1000 };

      await controller.purchaseCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid user ID' });
      expect(mockMemberService.purchaseCredits).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const userId = 1;
      const invalidData = {
        credits: 10,
        // Missing amount, paymentMethod, transactionId
      };

      mockRequest.params = { userId: userId.toString() };
      mockRequest.body = invalidData;
      mockMemberService.purchaseCredits.mockRejectedValue(new Error('Missing required fields'));

      await controller.purchaseCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields: credits, amount, paymentMethod, transactionId' });
    });

    it('should handle member not found error', async () => {
      const userId = 999;
      const purchaseData = {
        credits: 10,
        amount: 1000,
        paymentMethod: 'card',
        transactionId: 'txn_123',
      };

      mockRequest.params = { userId: userId.toString() };
      mockRequest.body = purchaseData;
      mockMemberService.purchaseCredits.mockRejectedValue(new Error('Member not found'));

      await controller.purchaseCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to purchase credits' });
    });

    it('should handle generic service errors', async () => {
      const userId = 1;
      const purchaseData = {
        credits: 10,
        amount: 1000,
        paymentMethod: 'card',
        transactionId: 'txn_123',
      };

      mockRequest.params = { userId: userId.toString() };
      mockRequest.body = purchaseData;
      mockMemberService.purchaseCredits.mockRejectedValue(new Error('Payment processing failed'));

      await controller.purchaseCredits(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to purchase credits' });
    });
  });

  describe('getMemberProfile', () => {
    it('should return member profile', async () => {
      const userId = 1;
      const expectedProfile = {
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        creditsBalance: 25,
        status: 'active',
        publicVisibility: true,
      };

      mockRequest.params = { userId: userId.toString() };
      mockMemberService.getMemberProfile.mockResolvedValue(expectedProfile);

      await controller.getMemberProfile(mockRequest as Request, mockResponse as Response);

      expect(mockMemberService.getMemberProfile).toHaveBeenCalledWith(userId);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedProfile);
    });

    it('should handle invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid' };

      await controller.getMemberProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid user ID' });
    });

    it('should handle member not found error', async () => {
      const userId = 999;

      mockRequest.params = { userId: userId.toString() };
      mockMemberService.getMemberProfile.mockRejectedValue(new Error('Member not found'));

      await controller.getMemberProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to get member profile' });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = mockMemberService;
      const controller = new MemberController(customService);
      expect(controller).toBeInstanceOf(MemberController);
    });
  });
});
