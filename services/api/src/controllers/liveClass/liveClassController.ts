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

  postEmomMark = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const minuteIndex = Number(req.body?.minuteIndex);
      const finished = !!req.body?.finished;
      const finishSeconds = req.body?.finishSeconds == null ? null : Math.max(0, Number(req.body.finishSeconds));
      const exercisesCompleted = Math.max(0, Number(req.body?.exercisesCompleted || 0));
      const exercisesTotal     = Math.max(0, Number(req.body?.exercisesTotal || 0));

      await this.service.postEmomMark(
        classId,
        req.user.userId,
        { minuteIndex, finished, finishSeconds, exercisesCompleted, exercisesTotal }
      );
      return res.json({ ok: true });
    } catch (e: any) {
      const msg = e.message || '';
      const code =
        msg === 'SESSION_NOT_FOUND' || msg === 'NOT_EMOM_WORKOUT' ? 400 :
        msg === 'NOT_BOOKED' ? 403 : 500;
      return res.status(code).json({ error: msg || 'EMOM_MARK_FAILED' });
    }
  };

  getCoachNote = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const note = await this.service.getCoachNote(classId);
      return res.json({ note: note ?? '' });
    } catch {
      return res.status(500).json({ error: 'COACH_NOTE_FETCH_FAILED' });
    }
  };

  setCoachNote = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const text = String(req.body?.note ?? '');
      await this.service.setCoachNote(classId, req.user!.userId, text);
      return res.json({ ok: true, note: text });
    } catch (e:any) {
      const msg = e.message || '';
      if (msg === 'NOT_CLASS_COACH') return res.status(403).json({ error: msg });
      return res.status(500).json({ error: 'COACH_NOTE_SAVE_FAILED' });
    }
  };

  // --- Coach: FOR_TIME finish (seconds from class start) ---
  coachSetForTimeFinish = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId  = Number(req.body?.userId);
      const finishSeconds = req.body?.finishSeconds == null ? null : Number(req.body.finishSeconds); // null clears
      await this.service.coachSetForTimeFinish(classId, req.user!.userId, userId, finishSeconds);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'NOT_CLASS_COACH' ? 403 : 400;
      return res.status(code).json({ error: msg || 'FT_SET_FINISH_FAILED' });
    }
  };

  // --- Coach: AMRAP total reps ---
  coachSetAmrapTotal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId  = Number(req.body?.userId);
      const totalReps = Number(req.body?.totalReps ?? 0);
      await this.service.coachSetAmrapTotal(classId, req.user!.userId, userId, totalReps);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'NOT_CLASS_COACH' ? 403 : 400;
      return res.status(code).json({ error: msg || 'AMRAP_SET_TOTAL_FAILED' });
    }
  };

  // --- Coach: INTERVAL/TABATA step score ---
  coachPostIntervalScore = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId   = Number(req.params.classId);
      const userId    = Number(req.body?.userId);
      const stepIndex = Number(req.body?.stepIndex);
      const reps      = Number(req.body?.reps ?? 0);
      await this.service.coachPostIntervalScore(classId, req.user!.userId, userId, stepIndex, reps);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = ['INVALID_STEP_INDEX','STEP_INDEX_OUT_OF_RANGE'].includes(msg) ? 400
                : (msg === 'NOT_CLASS_COACH' ? 403 : 500);
      return res.status(code).json({ error: msg || 'INTERVAL_COACH_SCORE_FAILED' });
    }
  };

  // --- Coach: EMOM mark (minute) ---
  coachPostEmomMark = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId     = Number(req.params.classId);
      const userId      = Number(req.body?.userId);
      const minuteIndex = Number(req.body?.minuteIndex);
      const finished    = !!req.body?.finished;
      const finishSeconds = Number(req.body?.finishSeconds ?? 60);
      await this.service.coachPostEmomMark(classId, req.user!.userId, userId, minuteIndex, finished, finishSeconds);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'NOT_CLASS_COACH' ? 403 : 400;
      return res.status(code).json({ error: msg || 'EMOM_COACH_MARK_FAILED' });
    }
  };

  ftSetFinish = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId  = Number(req.body?.userId);
      const finishSeconds = Math.max(0, Number(req.body?.finishSeconds || 0));
      await this.service.coachForTimeSetFinishSecondsEndedOnly(classId, userId, finishSeconds);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'SESSION_NOT_FOUND' ? 404 : msg === 'NOT_ENDED' ? 409 : msg === 'NOT_BOOKED' ? 403 : 500;
      return res.status(code).json({ error: msg || 'FT_SET_FINISH_FAILED' });
    }
  };

  ftSetReps = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId  = Number(req.body?.userId);
      const totalReps = Math.max(0, Number(req.body?.totalReps || 0));
      await this.service.coachForTimeSetTotalRepsEndedOnly(classId, userId, totalReps);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'SESSION_NOT_FOUND' ? 404 : msg === 'NOT_ENDED' ? 409 : msg === 'NOT_BOOKED' ? 403 : 500;
      return res.status(code).json({ error: msg || 'FT_SET_REPS_FAILED' });
    }
  };

  amrapSetTotal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId  = Number(req.body?.userId);
      const totalReps = Math.max(0, Number(req.body?.totalReps || 0));
      await this.service.coachAmrapSetTotalEndedOnly(classId, userId, totalReps);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'SESSION_NOT_FOUND' ? 404 : msg === 'NOT_ENDED' ? 409 : msg === 'NOT_BOOKED' ? 403 : 500;
      return res.status(code).json({ error: msg || 'AMRAP_SET_TOTAL_FAILED' });
    }
  };

  intervalSetTotal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      const userId  = Number(req.body?.userId);
      const totalReps = Math.max(0, Number(req.body?.totalReps || 0));
      await this.service.coachIntervalSetTotalEndedOnly(classId, userId, totalReps);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'SESSION_NOT_FOUND' ? 404 : msg === 'NOT_ENDED' ? 409 : msg === 'NOT_BOOKED' ? 403 : 500;
      return res.status(code).json({ error: msg || 'INTERVAL_SET_TOTAL_FAILED' });
    }
  };

  getMyScaling = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const scaling = await this.service.getMyScaling(classId, req.user.userId);
      return res.json({ scaling });
    } catch {
      return res.status(500).json({ error: 'SCALING_FETCH_FAILED' });
    }
  };

  setMyScaling = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
      const classId = Number(req.params.classId);
      const scalingRaw = String(req.body?.scaling ?? '').toUpperCase();
      const scaling = scalingRaw === 'SC' ? 'SC' : 'RX'; // default RX
      await this.service.setMyScaling(classId, req.user.userId, scaling);
      return res.json({ ok: true, scaling });
    } catch (e:any) {
      const msg = e.message || '';
      const code = msg === 'NOT_BOOKED' ? 403 : 500;
      return res.status(code).json({ error: msg || 'SCALING_SAVE_FAILED' });
    }
  };
}