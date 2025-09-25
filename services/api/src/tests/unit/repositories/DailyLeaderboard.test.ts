import { DailyLeaderboardRepository } from '../../../repositories/dailyLeaderboard/dailyLeaderboardRepository';
import { builder } from '../../builder';
import {
  classes,
  workouts,
  users,
  members,
  classattendance,
} from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
          classId: 1,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 150,
          scaling: 'rx',
          workoutName: 'Morning HIIT',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 2,
          userId: 2,
          firstName: 'Jared',
          lastName: 'Hurlimam',
          score: 200,
          scaling: 'rx',
          workoutName: 'Evening Strength',
          workoutType: 'AMRAP',
        },
        {
          classId: 3,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 100,
          scaling: 'rx',
          workoutName: 'Afternoon Cardio',
          workoutType: 'TABATA',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(mockDb.select).toHaveBeenCalled();
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

      expect(result[1]).toEqual({
        userId: 2,
        firstName: 'Jared',
        lastName: 'Hurlimam',
        totalScore: 200,
        classCount: 1,
        bestScore: 200,
        bestWorkoutName: 'Evening Strength',
        scaling: 'rx',
      });
    });

    it('should filter by scaling when provided', async () => {
      const date = '2025-01-15';
      const scaling = 'scaled';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 3,
          firstName: 'Vansh',
          lastName: 'Sood',
          score: 120,
          scaling: 'scaled',
          workoutName: 'Beginner HIIT',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date, scaling);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].scaling).toBe('scaled');
      expect(result[0].firstName).toBe('Vansh');
    });

    it('should return empty array when no attendance records found', async () => {
      const date = '2025-01-15';
      mockDb.select.mockReturnValue(builder([]));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toEqual([]);
    });

    it('should handle null scores correctly', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 4,
          firstName: 'Dennis',
          lastName: 'Woodly',
          score: null,
          scaling: 'rx',
          workoutName: 'Recovery Session',
          workoutType: 'EMOM',
        },
        {
          classId: 2,
          userId: 4,
          firstName: 'Dennis',
          lastName: 'Woodly',
          score: 75,
          scaling: 'rx',
          workoutName: 'Light Cardio',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 4,
        firstName: 'Dennis',
        lastName: 'Woodly',
        totalScore: 75,
        classCount: 2,
        bestScore: 75,
        bestWorkoutName: 'Light Cardio',
        scaling: 'rx',
      });
    });

    it('should handle missing workout names', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 5,
          firstName: 'Amadeus',
          lastName: 'Test',
          score: 90,
          scaling: 'rx',
          workoutName: null,
          workoutType: null,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0].bestWorkoutName).toBe('Unknown Workout');
    });

    it('should sort by total score descending, then by class count', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 100,
          scaling: 'rx',
          workoutName: 'Workout A',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 2,
          userId: 2,
          firstName: 'Jared',
          lastName: 'Hurlimam',
          score: 100,
          scaling: 'rx',
          workoutName: 'Workout B',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 3,
          userId: 2,
          firstName: 'Jared',
          lastName: 'Hurlimam',
          score: 50,
          scaling: 'rx',
          workoutName: 'Workout C',
          workoutType: 'AMRAP',
        },
        {
          classId: 4,
          userId: 3,
          firstName: 'Vansh',
          lastName: 'Sood',
          score: 200,
          scaling: 'rx',
          workoutName: 'Workout D',
          workoutType: 'TABATA',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe(3);
      expect(result[0].totalScore).toBe(200);
      expect(result[1].userId).toBe(2);
      expect(result[1].totalScore).toBe(150);
      expect(result[1].classCount).toBe(2);
      expect(result[2].userId).toBe(1);
      expect(result[2].totalScore).toBe(100);
      expect(result[2].classCount).toBe(1);
    });

    it('should sort alphabetically when total scores and class counts are equal', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Vansh',
          lastName: 'Sood',
          score: 100,
          scaling: 'rx',
          workoutName: 'Workout A',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 2,
          userId: 2,
          firstName: 'Amadeus',
          lastName: 'Test',
          score: 100,
          scaling: 'rx',
          workoutName: 'Workout B',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 3,
          userId: 3,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 100,
          scaling: 'rx',
          workoutName: 'Workout C',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(3);
      expect(result[0].firstName).toBe('Amadeus');
      expect(result[1].firstName).toBe('Jason');
      expect(result[2].firstName).toBe('Vansh');
    });

    it('should handle multiple workouts for same user and find best score', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 80,
          scaling: 'rx',
          workoutName: 'Morning Warm-up',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 2,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 150,
          scaling: 'rx',
          workoutName: 'Main Workout',
          workoutType: 'AMRAP',
        },
        {
          classId: 3,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 120,
          scaling: 'rx',
          workoutName: 'Cool Down',
          workoutType: 'TABATA',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        totalScore: 350,
        classCount: 3,
        bestScore: 150,
        bestWorkoutName: 'Main Workout',
        scaling: 'rx',
      });
    });

    it('should handle different scaling types correctly', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 100,
          scaling: 'rx',
          workoutName: 'RX Workout',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 2,
          userId: 2,
          firstName: 'Jared',
          lastName: 'Hurlimam',
          score: 90,
          scaling: 'scaled',
          workoutName: 'Scaled Workout',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 3,
          userId: 3,
          firstName: 'Vansh',
          lastName: 'Sood',
          score: 85,
          scaling: 'beginner',
          workoutName: 'Beginner Workout',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(3);
      expect(result[0].scaling).toBe('rx');
      expect(result[1].scaling).toBe('scaled');
      expect(result[2].scaling).toBe('beginner');
    });

    it('should handle missing user names gracefully', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: null,
          lastName: null,
          score: 100,
          scaling: 'rx',
          workoutName: 'Test Workout',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('');
      expect(result[0].lastName).toBe('');
    });

    it('should default to rx scaling when scaling is null', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Dennis',
          lastName: 'Woodly',
          score: 100,
          scaling: null,
          workoutName: 'Test Workout',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0].scaling).toBe('rx');
    });

    it('should handle user with no workouts showing default values', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Amadeus',
          lastName: 'Test',
          score: 1,
          scaling: 'rx',
          workoutName: null,
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0].bestWorkoutName).toBe('Unknown Workout');
      expect(result[0].bestScore).toBe(1);
    });

    it('should throw error when database operation fails', async () => {
      const date = '2025-01-15';
      
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(dailyLeaderboardRepository.getDailyLeaderboard(date))
        .rejects.toThrow('Failed to fetch daily leaderboard');
    });
  });

  describe('transaction handling', () => {
    it('should use provided transaction executor when available', async () => {
      const mockTx = {
        select: jest.fn().mockReturnValue(builder([])),
      };
      const date = '2025-01-15';

      await dailyLeaderboardRepository.getDailyLeaderboard(date, undefined, mockTx);

      expect(mockTx.select).toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should use global db when no transaction provided', async () => {
      const date = '2025-01-15';
      mockDb.select.mockReturnValue(builder([]));

      await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle empty date string', async () => {
      const date = '';
      mockDb.select.mockReturnValue(builder([]));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toEqual([]);
    });

    it('should handle future dates', async () => {
      const date = '2025-12-31';
      mockDb.select.mockReturnValue(builder([]));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toEqual([]);
    });

    it('should handle complex leaderboard with many users', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = Array.from({ length: 50 }, (_, i) => ({
        classId: i + 1,
        userId: (i % 10) + 1,
        firstName: ['Jason', 'Jared', 'Vansh', 'Dennis', 'Amadeus'][i % 5],
        lastName: ['Mayo', 'Hurlimam', 'Sood', 'Woodly', 'Test'][i % 5],
        score: Math.floor(Math.random() * 200) + 50,
        scaling: ['rx', 'scaled', 'beginner'][i % 3],
        workoutName: `Workout ${i + 1}`,
        workoutType: 'FOR_TIME',
      }));

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);
      
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].totalScore).toBeGreaterThanOrEqual(result[i + 1].totalScore);
      }
    });

    it('should handle zero scores correctly', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          score: 0,
          scaling: 'rx',
          workoutName: 'Rest Day',
          workoutType: 'FOR_TIME',
        },
        {
          classId: 2,
          userId: 2,
          firstName: 'Jared',
          lastName: 'Hurlimam',
          score: 0,
          scaling: 'rx',
          workoutName: 'Recovery',
          workoutType: 'FOR_TIME',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(2);
      expect(result[0].totalScore).toBe(0);
      expect(result[1].totalScore).toBe(0);
    });

    it('should handle very high scores', async () => {
      const date = '2025-01-15';
      const mockLeaderboardData = [
        {
          classId: 1,
          userId: 1,
          firstName: 'Vansh',
          lastName: 'Sood',
          score: 999999,
          scaling: 'rx',
          workoutName: 'Epic Workout',
          workoutType: 'AMRAP',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboardData));

      const result = await dailyLeaderboardRepository.getDailyLeaderboard(date);

      expect(result).toHaveLength(1);
      expect(result[0].totalScore).toBe(999999);
      expect(result[0].bestScore).toBe(999999);
    });
  });
});
