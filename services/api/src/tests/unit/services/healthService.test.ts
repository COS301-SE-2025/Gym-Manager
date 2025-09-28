import { HealthService } from '../../../services/health/healthService';

describe('HealthService', () => {
  let service: HealthService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      ping: jest.fn(),
    };
    service = new HealthService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when database ping succeeds', async () => {
      mockRepository.ping.mockResolvedValue(undefined);

      const result = await service.checkHealth();

      expect(mockRepository.ping).toHaveBeenCalledWith(5000);
      expect(result).toEqual({
        ok: true,
        uptime: expect.any(Number),
        memory: expect.any(Number),
        version: process.env.npm_package_version,
        db: 'UP',
      });
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeGreaterThan(0);
    });

    it('should return unhealthy status when database ping fails', async () => {
      const error = new Error('Database connection failed');
      mockRepository.ping.mockRejectedValue(error);

      const result = await service.checkHealth();

      expect(mockRepository.ping).toHaveBeenCalledWith(5000);
      expect(result).toEqual({
        ok: false,
        uptime: expect.any(Number),
        memory: expect.any(Number),
        db: 'DOWN',
        error: 'Database connection failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockRepository.ping.mockRejectedValue('String error');

      const result = await service.checkHealth();

      expect(result).toEqual({
        ok: false,
        uptime: expect.any(Number),
        memory: expect.any(Number),
        db: 'DOWN',
        error: 'String error',
      });
    });

    it('should handle null/undefined errors', async () => {
      mockRepository.ping.mockRejectedValue(null);

      const result = await service.checkHealth();

      expect(result).toEqual({
        ok: false,
        uptime: expect.any(Number),
        memory: expect.any(Number),
        db: 'DOWN',
        error: 'null',
      });
    });

    it('should use APP_STARTED_AT environment variable for uptime calculation', () => {
      const originalEnv = process.env.APP_STARTED_AT;
      const startTime = '1640995200000'; // 2022-01-01 00:00:00 UTC
      process.env.APP_STARTED_AT = startTime;

      const newService = new HealthService(mockRepository);
      expect(newService['startedAt']).toBe(parseInt(startTime));

      process.env.APP_STARTED_AT = originalEnv;
    });

    it('should use current time when APP_STARTED_AT is not set', () => {
      const originalEnv = process.env.APP_STARTED_AT;
      delete process.env.APP_STARTED_AT;

      const newService = new HealthService(mockRepository);
      const now = Date.now();
      expect(newService['startedAt']).toBeCloseTo(now, -2); // Within 100ms

      process.env.APP_STARTED_AT = originalEnv;
    });
  });
});


