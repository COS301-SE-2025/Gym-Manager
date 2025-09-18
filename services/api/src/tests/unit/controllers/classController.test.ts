import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../infrastructure/middleware/authMiddleware';
import { ClassController } from '../../../controllers/class/classController';
import { ClassService } from '../../../services/class/classService';

// Mock the ClassService
jest.mock('../../../services/class/classService');

describe('ClassController', () => {
  let controller: ClassController;
  let mockClassService: jest.Mocked<ClassService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock ClassService
    mockClassService = {
      getCoachAssignedClasses: jest.fn(),
      getCoachClassesWithWorkouts: jest.fn(),
      getMemberBookedClasses: jest.fn(),
      getClassDetails: jest.fn(),
      createWorkout: jest.fn(),
      bookClass: jest.fn(),
      cancelBooking: jest.fn(),
      checkIn: jest.fn(),
      assignCoach: jest.fn(),
      assignWorkout: jest.fn(),
      getAvailableClasses: jest.fn(),
      getClassHistory: jest.fn(),
      assignWorkoutToClass: jest.fn(),
      getAllClasses: jest.fn(),
      getMemberClasses: jest.fn(),
      getMemberUnbookedClasses: jest.fn(),
      checkInToClass: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new ClassController(mockClassService);

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

  describe('getCoachAssignedClasses', () => {
    it('should return assigned classes for authenticated coach', async () => {
      const expectedClasses = [
        { 
          classId: 1, 
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '08:00',
          durationMinutes: 60,
          createdBy: 1
        },
        { 
          classId: 2, 
          capacity: 15,
          scheduledDate: '2024-01-02',
          scheduledTime: '18:00',
          durationMinutes: 45,
          createdBy: 1
        },
      ];

      mockClassService.getCoachAssignedClasses.mockResolvedValue(expectedClasses);

      await controller.getCoachAssignedClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.getCoachAssignedClasses).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedClasses);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getCoachAssignedClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockClassService.getCoachAssignedClasses).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockClassService.getCoachAssignedClasses.mockRejectedValue(new Error('Database error'));

      await controller.getCoachAssignedClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch assigned classes' });
    });
  });

  describe('bookClass', () => {
    it('should book class successfully', async () => {
      const bookingData = {
        classId: 1,
      };

      mockRequest.body = bookingData;
      mockClassService.bookClass.mockResolvedValue(undefined);

      await controller.bookClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.bookClass).toHaveBeenCalledWith(1, 1); // memberId, classId
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { classId: 1 };

      await controller.bookClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle class full error', async () => {
      const bookingData = { classId: 1 };
      mockRequest.body = bookingData;
      mockClassService.bookClass.mockRejectedValue(new Error('Class full'));

      await controller.bookClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Class full' });
    });
  });

  describe('getCoachClassesWithWorkouts', () => {
    it('should return coach classes with workouts', async () => {
      const expectedClasses = [
        { 
          classId: 1, 
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '08:00',
          durationMinutes: 60,
          createdBy: 1,
          workoutId: 1, 
          workoutName: 'HIIT',
          bookingsCount: 5
        },
        { 
          classId: 2, 
          capacity: 15,
          scheduledDate: '2024-01-02',
          scheduledTime: '18:00',
          durationMinutes: 45,
          createdBy: 1,
          workoutId: 2, 
          workoutName: 'Yoga',
          bookingsCount: 3
        },
      ];

      mockClassService.getCoachClassesWithWorkouts.mockResolvedValue(expectedClasses);

      await controller.getCoachClassesWithWorkouts(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.getCoachClassesWithWorkouts).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedClasses);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getCoachClassesWithWorkouts(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      mockClassService.getCoachClassesWithWorkouts.mockRejectedValue(new Error('Database error'));

      await controller.getCoachClassesWithWorkouts(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch classes' });
    });
  });

  describe('assignWorkoutToClass', () => {
    it('should assign workout to class successfully', async () => {
      const assignmentData = { classId: 1, workoutId: 2 };
      mockRequest.body = assignmentData;

      mockClassService.assignWorkoutToClass.mockResolvedValue(undefined);

      await controller.assignWorkoutToClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.assignWorkoutToClass).toHaveBeenCalledWith(1, 1, 2);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.assignWorkoutToClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle unauthorized or class not found error', async () => {
      const assignmentData = { classId: 1, workoutId: 2 };
      mockRequest.body = assignmentData;
      mockClassService.assignWorkoutToClass.mockRejectedValue(new Error('Unauthorized or class not found'));

      await controller.assignWorkoutToClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized or class not found' });
    });

    it('should handle service errors', async () => {
      const assignmentData = { classId: 1, workoutId: 2 };
      mockRequest.body = assignmentData;
      mockClassService.assignWorkoutToClass.mockRejectedValue(new Error('Database error'));

      await controller.assignWorkoutToClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to assign workout' });
    });
  });

  describe('createWorkout', () => {
    it('should create workout successfully', async () => {
      const workoutData = {
        workoutName: 'HIIT Workout',
        type: 'AMRAP',
        metadata: { timeCap: 600 },
        rounds: [{ exercises: [{ name: 'Pushups', reps: 10 }] }],
      };
      mockRequest.body = workoutData;

      mockClassService.createWorkout.mockResolvedValue(123);

      await controller.createWorkout(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.createWorkout).toHaveBeenCalledWith(workoutData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        workoutId: 123,
        message: 'Workout created with rounds, subrounds & exercises.',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.createWorkout(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle validation errors', async () => {
      const workoutData = { workoutName: 'HIIT Workout' }; // Missing required fields
      mockRequest.body = workoutData;
      mockClassService.createWorkout.mockRejectedValue(new Error('type is required'));

      await controller.createWorkout(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'type is required' });
    });

    it('should handle service errors', async () => {
      const workoutData = {
        workoutName: 'HIIT Workout',
        type: 'AMRAP',
        metadata: { timeCap: 600 },
        rounds: [{ exercises: [{ name: 'Pushups', reps: 10 }] }],
      };
      mockRequest.body = workoutData;
      mockClassService.createWorkout.mockRejectedValue(new Error('Database error'));

      await controller.createWorkout(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getAllClasses', () => {
    it('should return all classes for user', async () => {
      const expectedClasses = [
        { 
          classId: 1, 
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '08:00',
          durationMinutes: 60,
          createdBy: 1,
          workoutName: 'Morning HIIT',
          bookingsCount: 5
        },
        { 
          classId: 2, 
          capacity: 15,
          scheduledDate: '2024-01-02',
          scheduledTime: '18:00',
          durationMinutes: 45,
          createdBy: 1,
          workoutName: 'Evening Yoga',
          bookingsCount: 3
        },
      ];

      mockClassService.getAllClasses.mockResolvedValue(expectedClasses);

      await controller.getAllClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.getAllClasses).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedClasses);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getAllClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle unauthorized error', async () => {
      mockClassService.getAllClasses.mockRejectedValue(new Error('Unauthorized'));

      await controller.getAllClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      mockClassService.getAllClasses.mockRejectedValue(new Error('Database error'));

      await controller.getAllClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch classes' });
    });
  });

  describe('getMemberClasses', () => {
    it('should return member booked classes', async () => {
      const expectedClasses = [
        { 
          classId: 1, 
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '08:00',
          durationMinutes: 60,
          createdBy: 1,
          workoutName: 'Morning HIIT',
          bookingsCount: 5
        },
        { 
          classId: 2, 
          capacity: 15,
          scheduledDate: '2024-01-02',
          scheduledTime: '18:00',
          durationMinutes: 45,
          createdBy: 1,
          workoutName: 'Evening Yoga',
          bookingsCount: 3
        },
      ];

      mockClassService.getMemberClasses.mockResolvedValue(expectedClasses);

      await controller.getMemberClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.getMemberClasses).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedClasses);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getMemberClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      mockClassService.getMemberClasses.mockRejectedValue(new Error('Database error'));

      await controller.getMemberClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch member classes' });
    });
  });

  describe('getMemberUnbookedClasses', () => {
    it('should return member unbooked classes', async () => {
      const expectedClasses = [
        { 
          classId: 3, 
          capacity: 12,
          scheduledDate: '2024-01-03',
          scheduledTime: '14:00',
          durationMinutes: 50,
          createdBy: 1,
          workoutName: 'Afternoon Pilates',
          bookingsCount: 2
        },
        { 
          classId: 4, 
          capacity: 18,
          scheduledDate: '2024-01-04',
          scheduledTime: '19:00',
          durationMinutes: 75,
          createdBy: 1,
          workoutName: 'Evening Strength',
          bookingsCount: 0
        },
      ];

      mockClassService.getMemberUnbookedClasses.mockResolvedValue(expectedClasses);

      await controller.getMemberUnbookedClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.getMemberUnbookedClasses).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedClasses);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getMemberUnbookedClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      mockClassService.getMemberUnbookedClasses.mockRejectedValue(new Error('Database error'));

      await controller.getMemberUnbookedClasses(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to fetch member unbooked classes' });
    });
  });

  describe('checkInToClass', () => {
    it('should check in member to class successfully', async () => {
      const checkInData = { classId: 1, memberId: 2 };
      const expectedAttendance = { attendanceId: 123, classId: 1, memberId: 2 };

      mockRequest.body = checkInData;
      mockClassService.checkInToClass.mockResolvedValue(expectedAttendance);

      await controller.checkInToClass(mockRequest as Request, mockResponse as Response);

      expect(mockClassService.checkInToClass).toHaveBeenCalledWith(1, 2);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, attendance: expectedAttendance });
    });

    it('should return 400 when missing required fields', async () => {
      mockRequest.body = { classId: 1 }; // Missing memberId

      await controller.checkInToClass(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'classId and memberId are required' });
    });

    it('should handle already checked in error', async () => {
      const checkInData = { classId: 1, memberId: 2 };
      mockRequest.body = checkInData;
      mockClassService.checkInToClass.mockRejectedValue(new Error('Already checked in'));

      await controller.checkInToClass(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Already checked in' });
    });

    it('should handle service errors', async () => {
      const checkInData = { classId: 1, memberId: 2 };
      mockRequest.body = checkInData;
      mockClassService.checkInToClass.mockRejectedValue(new Error('Database error'));

      await controller.checkInToClass(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to check in, class not booked' });
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      const cancelData = { classId: 1 };
      mockRequest.body = cancelData;

      mockClassService.cancelBooking.mockResolvedValue(undefined);

      await controller.cancelBooking(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockClassService.cancelBooking).toHaveBeenCalledWith(1, 1);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.cancelBooking(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 when classId is missing', async () => {
      mockRequest.body = {};

      await controller.cancelBooking(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'classId is required' });
    });

    it('should handle booking not found error', async () => {
      const cancelData = { classId: 1 };
      mockRequest.body = cancelData;
      mockClassService.cancelBooking.mockRejectedValue(new Error('Booking not found'));

      await controller.cancelBooking(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Booking not found' });
    });

    it('should handle service errors', async () => {
      const cancelData = { classId: 1 };
      mockRequest.body = cancelData;
      mockClassService.cancelBooking.mockRejectedValue(new Error('Database error'));

      await controller.cancelBooking(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to cancel booking' });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = new ClassService();
      const controller = new ClassController(customService);
      expect(controller).toBeInstanceOf(ClassController);
    });

    it('should create controller with default service when none provided', () => {
      const controller = new ClassController();
      expect(controller).toBeInstanceOf(ClassController);
    });
  });
});