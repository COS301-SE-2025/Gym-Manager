import { DailyLeaderboardRepository } from '../../../repositories/dailyLeaderboard/dailyLeaderboardRepository';

jest.mock('../../../db/client', () => ({
  db: {
    execute: jest.fn(),
  },
}));

describe('DailyLeaderboardRepository', () => {
  let dailyLeaderboardRepository: DailyLeaderboardRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    dailyLeaderboardRepository = new DailyLeaderboardRepository();
  });

  describe('getDailyLeaderboard', () => {
    it('should return leaderboard sorted by total score', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          totalScore: 250,
          classCount: 2,
          bestScore: 150,
          bestWorkoutName: 'Morning HIIT',
          scaling: 'rx',
        },
        {
          userId: 2,
          firstName: 'Jared',
          lastName: 'Hurlimam',
          totalScore: 200,
          classCount: 1,
          bestScore: 200,
          bestWorkoutName: 'Evening Strength',
          scaling: 'rx',
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockLeaderboardData });

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        totalScore: 250,
        classCount: 2,
        bestScore: 150,
        bestWorkoutName: 'Morning HIIT',
        scaling: 'rx',
      });
    });

    it('should return empty array when no attendance records found', async () => {
      const date = '2025-01-15';
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw error when database operation fails', async () => {
      const date = '2025-01-15';
      mockDb.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(dailyLeaderboardRepository.getDailyLeaderboard(date))
        .rejects.toThrow('Database connection failed');
    });
  });
});

