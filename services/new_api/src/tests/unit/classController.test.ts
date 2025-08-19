/**
 * classController.test.ts – unit tests for every branch in classController
 */
import { Request, Response } from 'express';
import { 
  getCoachAssignedClasses, 
  getCoachClassesWithWorkouts,
  assignWorkoutToClass 
} from '../../controllers/classController';
import { ClassRepository } from '../../repositories/class/classRepository';
import UserRepository from '../../repositories/user.repository';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';

// Mock repositories
jest.mock('../../repositories/class/classRepository');
jest.mock('../../repositories/user.repository');

const MockedClassRepository = ClassRepository as jest.MockedClass<typeof ClassRepository>;
const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('ClassController', () => {
  let mockClassRepo: jest.Mocked<ClassRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockRes: Response;
  let mockAuthenticatedReq: AuthenticatedRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClassRepo = new MockedClassRepository() as jest.Mocked<ClassRepository>;
    mockUserRepo = new MockedUserRepository() as jest.Mocked<UserRepository>;
    
    (ClassRepository as any).mockImplementation(() => mockClassRepo);
    (UserRepository as any).mockImplementation(() => mockUserRepo);
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any as Response;
    
    mockAuthenticatedReq = {
      user: { userId: 1 }
    } as AuthenticatedRequest;
    
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCoachAssignedClasses', () => {
    it('should return assigned classes for coach', async () => {
      const mockClasses = [
        { 
          classId: 1, 
          className: 'HIIT Class',
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '09:00',
          durationMinutes: 60,
          createdBy: 1
        },
        { 
          classId: 2, 
          className: 'Strength Class',
          capacity: 15,
          scheduledDate: '2024-01-01',
          scheduledTime: '10:00',
          durationMinutes: 45,
          createdBy: 1
        }
      ];
      
      mockClassRepo.findAssignedClassesByCoach.mockResolvedValue(mockClasses);

      await getCoachAssignedClasses(mockAuthenticatedReq, mockRes);

      expect(mockClassRepo.findAssignedClassesByCoach).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith(mockClasses);
    });

    it('should reject unauthenticated requests', async () => {
      const unauthenticatedReq = {} as AuthenticatedRequest;

      await getCoachAssignedClasses(unauthenticatedReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle errors gracefully', async () => {
      mockClassRepo.findAssignedClassesByCoach.mockRejectedValue(new Error('Database error'));

      await getCoachAssignedClasses(mockAuthenticatedReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch assigned classes' });
    });
  });

  describe('getCoachClassesWithWorkouts', () => {
    it('should return classes with workouts for coach', async () => {
      const mockClassesWithWorkouts = [
        { 
          classId: 1, 
          className: 'HIIT Class', 
          workout: { workoutId: 1, name: 'HIIT Workout' },
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '09:00',
          durationMinutes: 60,
          createdBy: 1
        }
      ];
      
      mockClassRepo.findAssignedClassesWithWorkoutsByCoach.mockResolvedValue(mockClassesWithWorkouts);

      await getCoachClassesWithWorkouts(mockAuthenticatedReq, mockRes);

      expect(mockClassRepo.findAssignedClassesWithWorkoutsByCoach).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith(mockClassesWithWorkouts);
    });

    it('should reject unauthenticated requests', async () => {
      const unauthenticatedReq = {} as AuthenticatedRequest;

      await getCoachClassesWithWorkouts(unauthenticatedReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle errors gracefully', async () => {
      mockClassRepo.findAssignedClassesWithWorkoutsByCoach.mockRejectedValue(new Error('Database error'));

      await getCoachClassesWithWorkouts(mockAuthenticatedReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch classes' });
    });
  });

  describe('assignWorkoutToClass', () => {
    it('should successfully assign workout to class', async () => {
      const mockAssignedClasses = [
        { 
          classId: 1, 
          className: 'HIIT Class',
          capacity: 20,
          scheduledDate: '2024-01-01',
          scheduledTime: '09:00',
          durationMinutes: 60,
          createdBy: 1
        }
      ];
      
      mockClassRepo.findAssignedClassesByCoach.mockResolvedValue(mockAssignedClasses);
      mockClassRepo.updateWorkoutForClass.mockResolvedValue(undefined);

      const req = {
        ...mockAuthenticatedReq,
        body: { classId: 1, workoutId: 1 }
      } as AuthenticatedRequest;

      await assignWorkoutToClass(req, mockRes);

      expect(mockClassRepo.findAssignedClassesByCoach).toHaveBeenCalledWith(1);
      expect(mockClassRepo.updateWorkoutForClass).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should reject unauthenticated requests', async () => {
      const unauthenticatedReq = {} as AuthenticatedRequest;
      const req = {
        ...unauthenticatedReq,
        body: { classId: 1, workoutId: 1 }
      } as AuthenticatedRequest;

      await assignWorkoutToClass(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should reject assignment to unauthorized class', async () => {
      const mockAssignedClasses = [
        { 
          classId: 2, 
          className: 'Strength Class',
          capacity: 15,
          scheduledDate: '2024-01-01',
          scheduledTime: '10:00',
          durationMinutes: 45,
          createdBy: 1
        }
      ];
      
      mockClassRepo.findAssignedClassesByCoach.mockResolvedValue(mockAssignedClasses);

      const req = {
        ...mockAuthenticatedReq,
        body: { classId: 1, workoutId: 1 }
      } as AuthenticatedRequest;

      await assignWorkoutToClass(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized or class not found' });
      expect(mockClassRepo.updateWorkoutForClass).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockClassRepo.findAssignedClassesByCoach.mockRejectedValue(new Error('Database error'));

      const req = {
        ...mockAuthenticatedReq,
        body: { classId: 1, workoutId: 1 }
      } as AuthenticatedRequest;

      await assignWorkoutToClass(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to assign workout' });
    });
  });
});
