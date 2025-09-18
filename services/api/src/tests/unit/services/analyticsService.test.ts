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

  describe('getSummaryStats', () => {
    it('should calculate correct summary stats for today period', async () => {
      const today = new Date();
      const todayDate = today.toISOString().slice(0, 10);
      
      const mockClassesInPeriod = [
        { classId: 1, capacity: 10 },
        { classId: 2, capacity: 15 },
      ];

      const mockBookingCount = [{ value: 20 }]; // 20 total bookings
      const mockAttendanceCount = [{ value: 18 }]; // 18 people attended
      const mockCancellationCount = [{ value: 2 }]; // 2 cancellations

      // Mock classes query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockClassesInPeriod),
        }),
      });

      // Mock bookings query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockBookingCount),
        }),
      });

      // Mock attendance query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockAttendanceCount),
        }),
      });

      // Mock cancellations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockCancellationCount),
        }),
      });

      const result = await analyticsService.getSummaryStats('today');

      expect(result).toEqual({
        totalBookings: 20,
        fillRate: 0.8, // 20 bookings / 25 total capacity
        cancellationRate: 0.1, // 2 cancellations / 20 total bookings
        noShowRate: 0.9, // 18 attendances / 20 total bookings
      });
    });

    it('should handle empty data gracefully', async () => {
      // Mock empty classes
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await analyticsService.getSummaryStats('today');

      expect(result).toEqual({
        totalBookings: 0,
        fillRate: 0,
        cancellationRate: 0,
        noShowRate: 0,
      });
    });
  });

  describe('getOperationsData', () => {
    it('should return operations data for today period', async () => {
      const today = new Date();
      const todayDate = today.toISOString().slice(0, 10);
      
      const mockClassesInPeriod = [
        { classId: 1, capacity: 10, scheduledDate: todayDate },
        { classId: 2, capacity: 15, scheduledDate: todayDate },
      ];

      const mockBookingsData = [
        { classId: 1, count: 8 },
        { classId: 2, count: 12 },
      ];

      const mockAttendanceData = [
        { classId: 1, count: 7 },
        { classId: 2, count: 10 },
      ];

      const mockCancellationData = [
        { classId: 1, count: 1 },
        { classId: 2, count: 2 },
      ];

      // Mock classes query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockClassesInPeriod),
          }),
        }),
      });

      // Mock bookings query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockBookingsData),
          }),
        }),
      });

      // Mock attendance query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockAttendanceData),
          }),
        }),
      });

      // Mock cancellations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockCancellationData),
          }),
        }),
      });

      const result = await analyticsService.getOperationsData('today');

      expect(result).toEqual({
        labels: [expect.stringMatching(/Jan \d+|Feb \d+|Mar \d+|Apr \d+|May \d+|Jun \d+|Jul \d+|Aug \d+|Sep \d+|Oct \d+|Nov \d+|Dec \d+/)],
        datasets: [
          { label: 'Capacity', data: [25], borderColor: '#4b5563' },
          { label: 'Bookings', data: [20], borderColor: '#3b82f6' },
          { label: 'Attendance', data: [17], borderColor: '#22c55e' },
          { label: 'Cancellations', data: [3], borderColor: '#f97316' },
          { label: 'No-Shows', data: [3], borderColor: '#ef4444' }, // 20 bookings - 17 attendance
        ]
      });
    });

    it('should handle empty operations data gracefully', async () => {
      // Mock empty classes
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await analyticsService.getOperationsData('today');

      expect(result).toEqual({
        labels: [],
        datasets: []
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
