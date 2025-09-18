import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { AnalyticsController } from '../../controllers/analytics/analyticsController';
import { AnalyticsService } from '../../services/analytics/analyticsService';

// Mock the AnalyticsService
jest.mock('../../services/analytics/analyticsService');

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock AnalyticsService
    mockAnalyticsService = {
      getCoachAnalytics: jest.fn(),
      getMemberAnalytics: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new AnalyticsController(mockAnalyticsService);

    // Create mock request and response objects
    mockRequest = {
      user: { userId: 1, roles: ['coach'] },
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

  describe('getCoachAnalytics', () => {
    it('should return coach analytics for authenticated coach', async () => {
      const expectedAnalytics = {
        averageAttendance: 15,
        totalClasses: 10,
        averageFillRate: 75,
        attendanceTrends: [
          { date: '2024-01-01', attendance: 12, capacity: 20, fillRate: 60 },
          { date: '2024-01-02', attendance: 18, capacity: 20, fillRate: 90 },
        ],
      };

      mockAnalyticsService.getCoachAnalytics.mockResolvedValue(expectedAnalytics);

      await controller.getCoachAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockAnalyticsService.getCoachAnalytics).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedAnalytics);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getCoachAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockAnalyticsService.getCoachAnalytics).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockAnalyticsService.getCoachAnalytics.mockRejectedValue(new Error('Database error'));

      await controller.getCoachAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch coach analytics' });
    });
  });

  describe('getMemberAnalytics', () => {
    it('should return member analytics for authenticated member', async () => {
      const expectedAnalytics = {
        averageLeaderboardPosition: 5.5,
        totalClassesAttended: 20,
        classPerformance: [
          { 
            classId: 1, 
            workoutName: 'HIIT', 
            scheduledDate: '2024-01-01', 
            position: 8, 
            totalParticipants: 15, 
            score: 150 
          },
          { 
            classId: 2, 
            workoutName: 'Strength', 
            scheduledDate: '2024-01-02', 
            position: 3, 
            totalParticipants: 12, 
            score: 200 
          },
        ],
      };

      mockRequest.user = { userId: 1, roles: ['member'] };
      mockAnalyticsService.getMemberAnalytics.mockResolvedValue(expectedAnalytics);

      await controller.getMemberAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockAnalyticsService.getMemberAnalytics).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedAnalytics);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getMemberAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockAnalyticsService.getMemberAnalytics).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockRequest.user = { userId: 1, roles: ['member'] };
      mockAnalyticsService.getMemberAnalytics.mockRejectedValue(new Error('Service error'));

      await controller.getMemberAnalytics(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch member analytics' });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = new AnalyticsService();
      const controller = new AnalyticsController(customService);
      expect(controller).toBeInstanceOf(AnalyticsController);
    });

    it('should create controller with default service when none provided', () => {
      const controller = new AnalyticsController();
      expect(controller).toBeInstanceOf(AnalyticsController);
    });
  });
});
