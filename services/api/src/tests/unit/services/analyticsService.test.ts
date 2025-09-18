import { AnalyticsService } from '../../../services/analytics/analyticsService';

// Mock the database client
jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
  },
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockDb: any;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    mockDb = require('../../../db/client').db;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCoachAnalytics', () => {
    it('should return analytics for a coach with classes', async () => {
      const coachId = 1;
      // Use recent dates within the last 30 days
      const today = new Date();
      const recentDate1 = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 10 days ago
      const recentDate2 = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 5 days ago
      
      const mockCoachClasses = [
        {
          classId: 1,
          scheduledDate: recentDate1,
          workoutId: 1,
          workoutName: 'HIIT Workout',
          capacity: 10,
        },
        {
          classId: 2,
          scheduledDate: recentDate2,
          workoutId: 2,
          workoutName: 'Strength Training',
          capacity: 15,
        },
      ];

      const mockAttendanceData = [
        { classId: 1, attendanceCount: 8 },
        { classId: 2, attendanceCount: 12 },
      ];

      // Mock the query chain for coach classes
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockCoachClasses),
          }),
        }),
      });

      // Mock the query chain for attendance data
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockAttendanceData),
          }),
        }),
      });

      const result = await analyticsService.getCoachAnalytics(coachId);

      expect(result).toEqual({
        averageAttendance: 10, // (8 + 12) / 2
        totalClasses: 2,
        averageFillRate: 80, // (8 + 12) / (10 + 15) * 100
        attendanceTrends: expect.arrayContaining([
          expect.objectContaining({
            date: recentDate1,
            attendance: 8,
            capacity: 10,
            fillRate: 80,
          }),
          expect.objectContaining({
            date: recentDate2,
            attendance: 12,
            capacity: 15,
            fillRate: 80,
          }),
        ]),
      });
    });

    it('should return empty analytics for coach with no classes', async () => {
      const coachId = 1;

      // Mock empty classes
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await analyticsService.getCoachAnalytics(coachId);

      expect(result).toEqual({
        averageAttendance: 0,
        totalClasses: 0,
        averageFillRate: 0,
        attendanceTrends: [],
      });
    });
  });

  describe('getMemberAnalytics', () => {
    it('should return analytics for a member with attendance', async () => {
      const memberId = 1;
      const mockMemberAttendance = [
        {
          classId: 1,
          score: 100,
          markedAt: '2024-01-01T10:00:00Z',
          workoutName: 'HIIT Workout',
          scheduledDate: '2024-01-01',
        },
        {
          classId: 2,
          score: 80,
          markedAt: '2024-01-02T10:00:00Z',
          workoutName: 'Strength Training',
          scheduledDate: '2024-01-02',
        },
      ];

      const mockAllParticipants1 = [
        { memberId: 2, score: 120 },
        { memberId: 1, score: 100 },
        { memberId: 3, score: 90 },
      ];

      const mockAllParticipants2 = [
        { memberId: 1, score: 80 },
        { memberId: 2, score: 70 },
      ];

      // Mock the main query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(mockMemberAttendance),
              }),
            }),
          }),
        }),
      });

      // Mock the participant queries
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockAllParticipants1),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockAllParticipants2),
          }),
        }),
      });

      const result = await analyticsService.getMemberAnalytics(memberId);

      expect(result).toEqual({
        averageLeaderboardPosition: 1.5, // (2 + 1) / 2
        totalClassesAttended: 2,
        classPerformance: expect.arrayContaining([
          expect.objectContaining({
            classId: 1,
            workoutName: 'HIIT Workout',
            scheduledDate: '2024-01-01',
            position: 2,
            totalParticipants: 3,
            score: 100,
          }),
          expect.objectContaining({
            classId: 2,
            workoutName: 'Strength Training',
            scheduledDate: '2024-01-02',
            position: 1,
            totalParticipants: 2,
            score: 80,
          }),
        ]),
      });
    });

    it('should return empty analytics for member with no attendance', async () => {
      const memberId = 1;

      // Mock empty attendance
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await analyticsService.getMemberAnalytics(memberId);

      expect(result).toEqual({
        averageLeaderboardPosition: 0,
        totalClassesAttended: 0,
        classPerformance: [],
      });
    });
  });
});
