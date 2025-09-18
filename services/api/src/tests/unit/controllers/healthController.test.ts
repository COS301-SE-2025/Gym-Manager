import { Request, Response } from 'express';
import { HealthController } from '../../controllers/health/healthController';
import { HealthService } from '../../services/health/healthService';

// Mock the HealthService
jest.mock('../../services/health/healthService');

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthService: jest.Mocked<HealthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock HealthService
    mockHealthService = {
      checkHealth: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new HealthController(mockHealthService);

    // Create mock request and response objects
    mockRequest = {};

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy status when service returns ok: true', async () => {
      const healthyResult = {
        ok: true,
        uptime: 12345,
        memory: 1024,
        db: 'UP' as const,
      };

      mockHealthService.checkHealth.mockResolvedValue(healthyResult);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled(); // Should use default 200
      expect(mockResponse.json).toHaveBeenCalledWith(healthyResult);
    });

    it('should return 503 status when service returns ok: false', async () => {
      const unhealthyResult = {
        ok: false,
        uptime: 12345,
        memory: 1024,
        db: 'DOWN' as const,
        error: 'Database connection failed',
      };

      mockHealthService.checkHealth.mockResolvedValue(unhealthyResult);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(unhealthyResult);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      mockHealthService.checkHealth.mockRejectedValue(error);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        uptime: 0,
        db: 'DOWN',
        error: 'Health check failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockHealthService.checkHealth.mockRejectedValue('String error');

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        uptime: 0,
        db: 'DOWN',
        error: 'Health check failed',
      });
    });

    it('should handle null/undefined errors', async () => {
      mockHealthService.checkHealth.mockRejectedValue(null);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        uptime: 0,
        db: 'DOWN',
        error: 'Health check failed',
      });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = new HealthService();
      const controller = new HealthController(customService);
      expect(controller).toBeInstanceOf(HealthController);
    });

    it('should create controller with default service when none provided', () => {
      const controller = new HealthController();
      expect(controller).toBeInstanceOf(HealthController);
    });
  });
});
