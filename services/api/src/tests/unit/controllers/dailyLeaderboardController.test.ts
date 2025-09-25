import { Request, Response } from 'express';
import { DailyLeaderboardController } from '../../../controllers/dailyLeaderboard/dailyLeaderboardController';
import { IDailyLeaderboardService } from '../../../services/dailyLeaderboard/dailyLeaderboardService';

// Mock the DailyLeaderboardService
jest.mock('../../../services/dailyLeaderboard/dailyLeaderboardService');

describe('DailyLeaderboardController', () => {
  let controller: DailyLeaderboardController;
  let mockService: jest.Mocked<IDailyLeaderboardService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getDailyLeaderboard: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new DailyLeaderboardController(mockService);

    // Create mock request and response objects
    mockRequest = {
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getDailyLeaderboard', () => {
    it('should return leaderboard with default date and scaling', async () => {
      const mockLeaderboard = [
        { 
          userId: 1, 
          firstName: 'John', 
          lastName: 'Doe', 
          totalScore: 100, 
          classCount: 5,
          bestScore: 100,
          bestWorkoutName: 'HIIT',
          scaling: 'all'
        },
        { 
          userId: 2, 
          firstName: 'Jane', 
          lastName: 'Smith', 
          totalScore: 95, 
          classCount: 4,
          bestScore: 95,
          bestWorkoutName: 'Strength',
          scaling: 'all'
        },
      ];

      mockService.getDailyLeaderboard.mockResolvedValue(mockLeaderboard);

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      const today = new Date().toISOString().slice(0, 10);
      expect(mockService.getDailyLeaderboard).toHaveBeenCalledWith(undefined, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        date: today,
        scaling: 'all',
        leaderboard: mockLeaderboard,
        total: 2,
        message: 'Found 2 members with public scores',
      });
    });

    it('should return leaderboard with specific date and scaling', async () => {
      const mockLeaderboard = [
        { 
          userId: 1, 
          firstName: 'John', 
          lastName: 'Doe', 
          totalScore: 100, 
          classCount: 5,
          bestScore: 100,
          bestWorkoutName: 'HIIT',
          scaling: 'rx'
        },
      ];

      mockRequest.query = {
        date: '2024-01-15',
        scaling: 'rx',
      };

      mockService.getDailyLeaderboard.mockResolvedValue(mockLeaderboard);

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockService.getDailyLeaderboard).toHaveBeenCalledWith('2024-01-15', 'rx');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        date: '2024-01-15',
        scaling: 'rx',
        leaderboard: mockLeaderboard,
        total: 1,
        message: 'Found 1 members with public scores (RX)',
      });
    });

    it('should return empty leaderboard message when no results', async () => {
      mockRequest.query = {
        date: '2024-01-15',
        scaling: 'sc',
      };

      mockService.getDailyLeaderboard.mockResolvedValue([]);

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        date: '2024-01-15',
        scaling: 'sc',
        leaderboard: [],
        total: 0,
        message: 'No public scores found for this date with SC scaling',
      });
    });

    it('should handle invalid date format error', async () => {
      mockRequest.query = {
        date: 'invalid-date',
      };

      mockService.getDailyLeaderboard.mockRejectedValue(new Error('INVALID_DATE_FORMAT'));

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    });

    it('should handle future date error', async () => {
      mockRequest.query = {
        date: '2030-01-01',
      };

      mockService.getDailyLeaderboard.mockRejectedValue(new Error('FUTURE_DATE_NOT_ALLOWED'));

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot fetch leaderboard for future dates',
      });
    });

    it('should handle invalid scaling type error', async () => {
      mockRequest.query = {
        scaling: 'invalid',
      };

      mockService.getDailyLeaderboard.mockRejectedValue(new Error('INVALID_SCALING_TYPE'));

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid scaling type. Use "rx" or "sc"',
      });
    });

    it('should handle generic service errors', async () => {
      mockService.getDailyLeaderboard.mockRejectedValue(new Error('Database connection failed'));

      await controller.getDailyLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch daily leaderboard',
      });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = mockService;
      const controller = new DailyLeaderboardController(customService);
      expect(controller).toBeInstanceOf(DailyLeaderboardController);
    });
  });
});
