import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { roles } from '../middleware/roles';

import {
  getLeaderboard,
  getLiveClass,
  submitScore,
  startLiveClass,
  stopLiveClass,
  advanceProgress,
  submitPartial,
  getRealtimeLeaderboard,
  getWorkoutSteps,
  getMyProgress,
  postIntervalScore,
  getIntervalLeaderboard,
  getLiveSession,
  pauseLiveClass,
  resumeLiveClass,
} from '../controllers/ongoingClassController';

const router = express.Router();

// discovery / overview
router.get('/live/class', isAuthenticated, getLiveClass);
router.get('/live/:classId/session', isAuthenticated, getLiveSession);   // NEW
router.get('/workout/:workoutId/steps', isAuthenticated, getWorkoutSteps);

// leaderboards
router.get('/leaderboard/:classId', isAuthenticated, getLeaderboard);
router.get('/live/:classId/leaderboard', isAuthenticated, getRealtimeLeaderboard);

// auth'd member info
router.get('/live/:classId/me', isAuthenticated, getMyProgress);

// scoring
router.post('/submitScore', isAuthenticated, submitScore);

// coach controls
router.post('/coach/live/:classId/start', isAuthenticated, roles(['coach']), startLiveClass);
router.post('/coach/live/:classId/stop',  isAuthenticated, roles(['coach']), stopLiveClass);
router.post('/coach/live/:classId/pause',  isAuthenticated, roles(['coach']), pauseLiveClass);
router.post('/coach/live/:classId/resume', isAuthenticated, roles(['coach']), resumeLiveClass);

// member actions (FOR_TIME/AMRAP)
router.post('/live/:classId/advance', isAuthenticated, advanceProgress);
router.post('/live/:classId/partial', isAuthenticated, submitPartial);

// interval/tabata
router.post('/live/:classId/interval/score', isAuthenticated, postIntervalScore);
router.get('/live/:classId/interval/leaderboard', isAuthenticated, getIntervalLeaderboard);

export default router;
