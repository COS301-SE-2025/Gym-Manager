import { DailyLeaderboardService } from '../../services/dailyLeaderboard/dailyLeaderboardService';

describe('DailyLeaderboardService', () => {
  let service: DailyLeaderboardService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getDailyLeaderboard: jest.fn(),
    };
    service = new DailyLeaderboardService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyLeaderboard', () => {
    it('should return leaderboard for today when no date provided', async () => {
      const mockLeaderboard = [
        {
          memberId: 1,
          firstName: 'John',
          lastName: 'Doe',
          score: 100,
          position: 1,
        },
        {
          memberId: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          score: 90,
          position: 2,
        },
      ];

      mockRepository.getDailyLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getDailyLeaderboard();

      const today = new Date().toISOString().slice(0, 10);
      expect(mockRepository.getDailyLeaderboard).toHaveBeenCalledWith(today, undefined);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return leaderboard for specific date', async () => {
      const date = '2024-01-15';
      const scaling = 'rx';
      const mockLeaderboard = [
        {
          memberId: 1,
          firstName: 'John',
          lastName: 'Doe',
          score: 100,
          position: 1,
        },
      ];

      mockRepository.getDailyLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getDailyLeaderboard(date, scaling);

      expect(mockRepository.getDailyLeaderboard).toHaveBeenCalledWith(date, scaling);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should throw error for invalid date format', async () => {
      const invalidDate = '2024/01/15';

      await expect(
        service.getDailyLeaderboard(invalidDate)
      ).rejects.toThrow('INVALID_DATE_FORMAT');
    });

    it('should throw error for future date', async () => {
      const futureDate = '2099-12-31';

      await expect(
        service.getDailyLeaderboard(futureDate)
      ).rejects.toThrow('FUTURE_DATE_NOT_ALLOWED');
    });

    it('should throw error for invalid scaling type', async () => {
      const date = '2024-01-15';
      const invalidScaling = 'invalid';

      await expect(
        service.getDailyLeaderboard(date, invalidScaling)
      ).rejects.toThrow('INVALID_SCALING_TYPE');
    });

    it('should accept valid scaling types', async () => {
      const date = '2024-01-15';
      const mockLeaderboard = [];

      mockRepository.getDailyLeaderboard.mockResolvedValue(mockLeaderboard);

      // Test 'rx' scaling
      await service.getDailyLeaderboard(date, 'rx');
      expect(mockRepository.getDailyLeaderboard).toHaveBeenCalledWith(date, 'rx');

      // Test 'sc' scaling
      await service.getDailyLeaderboard(date, 'sc');
      expect(mockRepository.getDailyLeaderboard).toHaveBeenCalledWith(date, 'sc');
    });

    it('should handle repository errors', async () => {
      const date = '2024-01-15';
      const error = new Error('Database connection failed');

      mockRepository.getDailyLeaderboard.mockRejectedValue(error);

      await expect(
        service.getDailyLeaderboard(date)
      ).rejects.toThrow('Database connection failed');
    });
  });
});
