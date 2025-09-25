import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { ClassService } from '../../services/class/classService';
import {
  CreateWorkoutRequest,
  BookClassRequest,
  CheckInRequest,
  AssignCoachRequest,
  AssignWorkoutRequest
} from '../../domain/entities/class.entity';

/**
 * ClassController - Controller Layer
 * Handles HTTP requests/responses and delegates business logic to service layer
 */
export class ClassController {
  private classService: ClassService;

  constructor(classService?: ClassService) {
    this.classService = classService || new ClassService();
  }

  getCoachAssignedClasses = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const coachId = req.user.userId;

    try {
      const assignedClasses = await this.classService.getCoachAssignedClasses(coachId);
      res.json(assignedClasses);
    } catch (error: any) {
      console.error('getCoachAssignedClasses error:', error);
      res.status(500).json({ error: 'Failed to fetch assigned classes' });
    }
  };

  getCoachClassesWithWorkouts = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      console.log('Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const coachId = req.user.userId;

    try {
      const classWithWorkouts = await this.classService.getCoachClassesWithWorkouts(coachId);
      res.json(classWithWorkouts);
    } catch (error: any) {
      console.error('getCoachClassesWithWorkouts error:', error);
      res.status(500).json({ error: 'Failed to fetch classes' });
    }
  };

  assignWorkoutToClass = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const coachId = req.user.userId;
    const { classId, workoutId } = req.body;

    try {
      await this.classService.assignWorkoutToClass(coachId, classId, workoutId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('assignWorkoutToClass error:', error);
      
      if (error.message === 'Unauthorized or class not found') {
        return res.status(403).json({ error: 'Unauthorized or class not found' });
      }

      res.status(500).json({ error: 'Failed to assign workout' });
    }
  };

  createWorkout = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      workoutName,
      type,
      metadata,
      rounds: roundsInput,
    } = req.body as CreateWorkoutRequest;

    try {
      const workoutData: CreateWorkoutRequest = {
        workoutName,
        type,
        metadata,
        rounds: roundsInput,
      };

      const newWorkoutId = await this.classService.createWorkout(workoutData);

      return res.json({
        success: true,
        workoutId: newWorkoutId,
        message: 'Workout created with rounds, subrounds & exercises.',
      });
    } catch (error: any) {
      console.error('createWorkout error:', error);
      
      if (error.message.includes('is required') || 
          error.message.includes('must be') || 
          error.message.includes('needs') ||
          error.message.includes('each')) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(400).json({ error: error.message || 'Insert failed' });
    }
  };

  updateWorkout = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workoutId = Number(req.params.workoutId);
    if (!Number.isFinite(workoutId)) {
      return res.status(400).json({ error: 'Invalid workout ID' });
    }

    const {
      workoutName,
      type,
      metadata,
      rounds: roundsInput,
    } = req.body as CreateWorkoutRequest;

    try {
      const workoutData: CreateWorkoutRequest = {
        workoutName,
        type,
        metadata,
        rounds: roundsInput,
      };

      const updatedWorkoutId = await this.classService.updateWorkout(workoutId, workoutData);

      return res.json({
        success: true,
        workoutId: updatedWorkoutId,
        message: 'Workout updated with rounds, subrounds & exercises.',
      });
    } catch (error: any) {
      console.error('updateWorkout error:', error);
      
      if (error.message.includes('is required') || 
          error.message.includes('must be') || 
          error.message.includes('needs') ||
          error.message.includes('each')) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(400).json({ error: error.message || 'Update failed' });
    }
  };

  getAllClasses = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.userId;

    try {
      const classesList = await this.classService.getAllClasses(userId);
      return res.json(classesList);
    } catch (error: any) {
      console.error('getAllClasses error:', error);
      
      if (error.message === 'Unauthorized') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      return res.status(500).json({ error: 'Failed to fetch classes' });
    }
  };

  getMemberClasses = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const memberId = req.user.userId;

    try {
      const bookedClasses = await this.classService.getMemberClasses(memberId);
      return res.json(bookedClasses);
    } catch (error: any) {
      console.error('getMemberClasses error:', error);
      return res.status(500).json({ error: 'Failed to fetch member classes' });
    }
  };

  getMemberUnbookedClasses = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const memberId = req.user.userId;

    try {
      const unbooked = await this.classService.getMemberUnbookedClasses(memberId);
      return res.json(unbooked);
    } catch (error: any) {
      console.error('getMemberUnbookedClasses error:', error);
      return res.status(500).json({ error: 'Failed to fetch member unbooked classes' });
    }
  };

  bookClass = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const memberId = req.user.userId;
    const classId = Number(req.body.classId);

    try {
      await this.classService.bookClass(memberId, classId);
      return res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Invalid class ID') {
        return res.status(400).json({ error: 'Invalid class ID' });
      }
      
      if (error.message === 'Class not found') {
        return res.status(404).json({ error: 'Class not found' });
      }
      
      if (error.message === 'Class has already ended') {
        return res.status(400).json({ error: 'Class has already ended' });
      }
      
      if (error.message === 'Already booked') {
        return res.status(400).json({ error: 'Already booked' });
      }
      
      if (error.message === 'Overlapping booking') {
        return res.status(400).json({ error: 'Overlapping booking' });
      }
      
      if (error.message === 'Class full') {
        return res.status(400).json({ error: 'Class full' });
      }
      
      if (error.message === 'Insufficient credits') {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      console.error('bookClass error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  };

  checkInToClass = async (req: Request, res: Response) => {
    const { classId, memberId } = req.body;

    if (!classId || !memberId) {
      return res.status(400).json({ error: 'classId and memberId are required' });
    }

    try {
      const attendance = await this.classService.checkInToClass(classId, memberId);
      return res.status(201).json({ success: true, attendance });
    } catch (error: any) {
      console.error('checkInToClass error:', error);
      
      if (error.message === 'Already checked in') {
        return res.status(409).json({ error: 'Already checked in' });
      }

      return res.status(500).json({ error: 'Failed to check in, class not booked' });
    }
  };

  cancelBooking = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { classId } = req.body;
    const memberId = req.user.userId;

    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    try {
      await this.classService.cancelBooking(classId, memberId);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('cancelBooking error:', error);
      
      if (error.message === 'Booking not found') {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.status(500).json({ error: 'Failed to cancel booking' });
    }
  };
}
