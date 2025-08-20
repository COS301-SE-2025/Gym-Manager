import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { LiveClassService } from '../../services/liveClass/liveClassService';

export class LiveClassController {
  private service: LiveClassService;

  constructor(service?: LiveClassService) {
    this.service = service || new LiveClassService();
  }

  getLiveSession = async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const session = await this.service.getLiveSession(classId);
      if (!session) return res.status(404).json({ error: 'NO_SESSION' });
      return res.json(session);
    } catch (e: any) {
      if (e.message === 'INVALID_CLASS_ID') return res.status(400).json({ error: e.message });
      return res.status(500).json({ error: 'SESSION_FETCH_FAILED' });
    }
  };

  getLeaderboard = async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const data = await this.service.getFinalLeaderboard(classId);
      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  };

  getLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const result = await this.service.getLiveClassForUser(req.user.userId, req.user.roles);
      return res.json(result);
    } catch {
      return res.status(500).json({ error: 'LIVE_CLASS_FAILED' });
    }
  };

  getWorkoutSteps = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workoutId = Number(req.params.workoutId);
      const out = await this.service.getWorkoutSteps(workoutId);
      return res.json(out);
    } catch (e: any) {
      if (e.message === 'INVALID_WORKOUT_ID') return res.status(400).json({ error: e.message });
      return res.status(500).json({ error: 'WORKOUT_STEPS_FAILED' });
    }
  };

  submitScore = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const out = await this.service.submitScore(req.user.userId, req.user.roles, req.body);
      return res.json(out);
    } catch (e: any) {
      const msg = e.message || '';
      if (['CLASS_ID_REQUIRED','NOT_CLASS_COACH','ROLE_NOT_ALLOWED','NOT_BOOKED','SCORE_REQUIRED'].includes(msg))
        return res.status(msg === 'CLASS_ID_REQUIRED' || msg === 'SCORE_REQUIRED' ? 400 : 403).json({ success: false, error: msg });
      return res.status(500).json({ success: false, error: 'SUBMIT_SCORE_FAILED' });
    }
  };

  startLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const session = await this.service.startLiveClass(classId);
      return res.json({ ok: true, session });
    } catch (e: any) {
      if (e.message === 'CLASS_NOT_FOUND') return res.status(404).json({ error: e.message });
      if (e.message === 'WORKOUT_NOT_ASSIGNED') return res.status(400).json({ error: e.message });
      return res.status(500).json({ error: 'START_LIVE_FAILED' });
    }
  };

  stopLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      await this.service.stopLiveClass(classId);
      return res.json({ ok: true, classId });
    } catch {
      return res.status(500).json({ error: 'STOP_LIVE_FAILED' });
    }
  };

  pauseLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      await this.service.pauseLiveClass(classId);
      return res.json({ ok: true, classId });
    } catch {
      return res.status(500).json({ error: 'PAUSE_LIVE_FAILED' });
    }
  };

  resumeLiveClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      await this.service.resumeLiveClass(classId);
      return res.json({ ok: true, classId });
    } catch {
      return res.status(500).json({ error: 'RESUME_LIVE_FAILED' });
    }
  };

  advanceProgress = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const direction = (req.body?.direction === 'prev') ? 'prev' : 'next';
      const out = await this.service.advanceProgress(classId, req.user.userId, direction);
      return res.json(out);
    } catch (e: any) {
      const msg = e.message || '';
      if (['CLASS_SESSION_NOT_STARTED','NOT_LIVE','TIME_UP'].includes(msg)) {
        const status = msg === 'CLASS_SESSION_NOT_STARTED' ? 400 : 409;
        return res.status(status).json({ error: msg, ended: msg === 'TIME_UP' });
      }
      return res.status(500).json({ error: 'ADVANCE_FAILED' });
    }
  };

  submitPartial = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const reps = Number(req.body?.reps ?? 0);
      const out = await this.service.submitPartial(classId, req.user.userId, reps);
      return res.json(out);
    } catch {
      return res.status(500).json({ error: 'PARTIAL_FAILED' });
    }
  };

  getRealtimeLeaderboard = async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const body = await this.service.getRealtimeLeaderboard(classId);
      return res.json(body);
    } catch (e: any) {
      if (e.message === 'WORKOUT_NOT_FOUND_FOR_CLASS') return res.status(404).json({ error: e.message });
      if (e.message === 'DB_CONNECTION_RESET') return res.status(503).json({ error: e.message });
      return res.status(500).json({ error: 'LEADERBOARD_FAILED' });
    }
  };

  getMyProgress = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const out = await this.service.getMyProgress(classId, req.user.userId);
      return res.json(out);
    } catch {
      return res.status(500).json({ error: 'MY_PROGRESS_FAILED' });
    }
  };

  postIntervalScore = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const stepIndex = Number(req.body?.stepIndex);
      const reps = Number(req.body?.reps ?? 0);
      await this.service.postIntervalScore(classId, req.user.userId, stepIndex, reps);
      return res.json({ ok: true });
    } catch (e: any) {
      const msg = e.message || '';
      const code = (msg === 'INVALID_STEP_INDEX' || msg === 'STEP_INDEX_OUT_OF_RANGE' || msg === 'NOT_INTERVAL_WORKOUT') ? 400
                : (msg === 'NOT_BOOKED') ? 403
                : (msg === 'SESSION_NOT_FOUND') ? 404
                : 500;
      return res.status(code).json({ error: msg || 'INTERVAL_SCORE_FAILED' });
    }
  };

  getIntervalLeaderboard = async (req: Request, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const rows = await this.service.getIntervalLeaderboard(classId);
      return res.json(rows);
    } catch {
      return res.status(500).json({ error: 'INTERVAL_LEADERBOARD_FAILED' });
    }
  };
}
