import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { LiveClassService } from '../../services/liveClass/liveClassService';
import {
  SubmitScoreRequest,
  AdvanceProgressRequest,
  SubmitPartialRequest,
  IntervalScoreRequest,
  StartLiveClassRequest
} from '../../domain/entities/liveClass.entity';

/**
 * LiveClassController - Controller Layer
 * Handles HTTP requests/responses and delegates business logic to service layer
 */
export class LiveClassController {
  private liveClassService: LiveClassService;

  constructor(liveClassService?: LiveClassService) {
    this.liveClassService = liveClassService || new LiveClassService();
  }

  getLeaderboard = async (req: Request, res: Response) => {
    const { classId } = req.params;
    
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }

    try {
      const leaderboard = await this.liveClassService.getLeaderboard(Number(classId));
      res.json(leaderboard);
    } catch (error: any) {
      console.error('Leaderboard fetch error:', error);
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  };

  getLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const userId = req.user.userId;
    let roles = req.user.roles as string[] | undefined;

    if (!roles) {
      // Fetch roles from database if not in token
      const { db } = await import('../../db/client');
      const { userroles } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const rows = await db
        .select({ role: userroles.userRole })
        .from(userroles)
        .where(eq(userroles.userId, userId));
      roles = rows.map(r => r.role as string);
    }

    try {
      const result = await this.liveClassService.getLiveClass(userId, roles);
      res.json(result);
    } catch (error: any) {
      console.error('getLiveClass error:', error);
      res.status(500).json({ error: 'Failed to get live class' });
    }
  };

  getWorkoutSteps = async (req: AuthenticatedRequest, res: Response) => {
    const workoutId = Number(req.params.workoutId);
    
    if (!workoutId) {
      return res.status(400).json({ error: 'INVALID_WORKOUT_ID' });
    }

    try {
      const result = await this.liveClassService.getWorkoutSteps(workoutId);
      res.json(result);
    } catch (error: any) {
      console.error('getWorkoutSteps error:', error);
      res.status(500).json({ error: 'Failed to get workout steps' });
    }
  };

  submitScore = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const userId = req.user.userId;
    let roles = req.user.roles as string[] | undefined;

    if (!roles) {
      // Fetch roles from database if not in token
      const { db } = await import('../../db/client');
      const { userroles } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const rows = await db
        .select({ role: userroles.userRole })
        .from(userroles)
        .where(eq(userroles.userId, userId));
      roles = rows.map(r => r.role as string);
    }

    const request: SubmitScoreRequest = req.body;

    try {
      const result = await this.liveClassService.submitScore(userId, roles, request);
      res.json(result);
    } catch (error: any) {
      console.error('submitScore error:', error);
      
      if (error.message === 'CLASS_ID_REQUIRED') {
        return res.status(400).json({ success: false, error: 'CLASS_ID_REQUIRED' });
      }
      
      if (error.message === 'NOT_CLASS_COACH') {
        return res.status(403).json({ success: false, error: 'NOT_CLASS_COACH' });
      }
      
      if (error.message === 'ROLE_NOT_ALLOWED') {
        return res.status(403).json({ success: false, error: 'ROLE_NOT_ALLOWED' });
      }
      
      if (error.message === 'SCORE_REQUIRED') {
        return res.status(400).json({ success: false, error: 'SCORE_REQUIRED' });
      }
      
      if (error.message === 'NOT_BOOKED') {
        return res.status(403).json({ success: false, error: 'NOT_BOOKED' });
      }

      res.status(500).json({ success: false, error: 'Failed to submit score' });
    }
  };

  startLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const classId = Number(req.params.classId);
      const request: StartLiveClassRequest = {
        restart: req.query.restart === 'true' || req.query.restart === '1' || req.query.restart === 'yes'
      };

      const result = await this.liveClassService.startLiveClass(classId, request);
      res.json(result);
    } catch (error: any) {
      console.error('startLiveClass error:', error);
      
      if (error.message === 'INVALID_CLASS_ID') {
        return res.status(400).json({ error: 'INVALID_CLASS_ID' });
      }
      
      if (error.message === 'CLASS_NOT_FOUND') {
        return res.status(404).json({ error: 'CLASS_NOT_FOUND' });
      }
      
      if (error.message === 'WORKOUT_NOT_ASSIGNED') {
        return res.status(400).json({ error: 'WORKOUT_NOT_ASSIGNED' });
      }

      res.status(500).json({ error: 'START_LIVE_FAILED' });
    }
  };

  stopLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const classId = Number(req.params.classId);
      const result = await this.liveClassService.stopLiveClass(classId);
      res.json(result);
    } catch (error: any) {
      console.error('stopLiveClass error:', error);
      res.status(500).json({ error: 'Failed to stop live class' });
    }
  };

  advanceProgress = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const classId = Number(req.params.classId);
      const userId = Number(req.user.userId);
      const request: AdvanceProgressRequest = {
        direction: req.body?.direction === 'prev' ? 'prev' : 'next'
      };

      const result = await this.liveClassService.advanceProgress(classId, userId, request);
      res.json(result);
    } catch (error: any) {
      console.error('advanceProgress error:', error);
      
      if (error.message === 'CLASS_SESSION_NOT_STARTED') {
        return res.status(400).json({ error: 'CLASS_SESSION_NOT_STARTED' });
      }

      res.status(500).json({ error: 'Failed to advance progress' });
    }
  };

  submitPartial = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const classId = Number(req.params.classId);
      const userId = Number(req.user.userId);
      const request: SubmitPartialRequest = {
        reps: Number(req.body?.reps ?? 0)
      };

      const result = await this.liveClassService.submitPartial(classId, userId, request);
      res.json(result);
    } catch (error: any) {
      console.error('submitPartial error:', error);
      res.status(500).json({ error: 'Failed to submit partial' });
    }
  };

  getRealtimeLeaderboard = async (req: Request, res: Response) => {
    const classId = Number(req.params.classId);
    
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: 'INVALID_CLASS_ID' });
    }

    try {
      const leaderboard = await this.liveClassService.getRealtimeLeaderboard(classId);
      res.json(leaderboard);
    } catch (error: any) {
      console.error('getRealtimeLeaderboard error:', error);
      res.status(500).json({ error: 'LEADERBOARD_FAILED' });
    }
  };

  getMyProgress = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const classId = Number(req.params.classId);
      const userId = Number(req.user.userId);
      const progress = await this.liveClassService.getMyProgress(classId, userId);
      res.json(progress);
    } catch (error: any) {
      console.error('getMyProgress error:', error);
      res.status(500).json({ error: 'Failed to get progress' });
    }
  };

  postIntervalScore = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const classId = Number(req.params.classId);
      const userId = Number(req.user.userId);
      const request: IntervalScoreRequest = {
        stepIndex: Number(req.body?.stepIndex),
        reps: Number(req.body?.reps ?? 0)
      };

      const result = await this.liveClassService.postIntervalScore(classId, userId, request);
      res.json(result);
    } catch (error: any) {
      console.error('postIntervalScore error:', error);
      
      if (error.message === 'INVALID_STEP_INDEX') {
        return res.status(400).json({ error: 'INVALID_STEP_INDEX' });
      }
      
      if (error.message === 'NOT_INTERVAL_WORKOUT') {
        return res.status(400).json({ error: 'NOT_INTERVAL_WORKOUT' });
      }
      
      if (error.message === 'STEP_INDEX_OUT_OF_RANGE') {
        return res.status(400).json({ error: 'STEP_INDEX_OUT_OF_RANGE' });
      }
      
      if (error.message === 'NOT_BOOKED') {
        return res.status(403).json({ error: 'NOT_BOOKED' });
      }

      res.status(500).json({ error: 'Failed to post interval score' });
    }
  };

  getIntervalLeaderboard = async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const leaderboard = await this.liveClassService.getIntervalLeaderboard(classId);
      res.json(leaderboard);
    } catch (error: any) {
      console.error('getIntervalLeaderboard error:', error);
      res.status(500).json({ error: 'Failed to get interval leaderboard' });
    }
  };
}
