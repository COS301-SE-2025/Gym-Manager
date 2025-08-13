import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { roles } from '../middleware/roles';

import {
  // existing
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
} from '../controllers/ongoingClassController';

const router = express.Router();

router.get('/live/class', isAuthenticated, getLiveClass);
router.get('/workout/:workoutId/steps', isAuthenticated, getWorkoutSteps);
router.get('/leaderboard/:classId', isAuthenticated, getLeaderboard);
router.post('/submitScore', isAuthenticated, submitScore);
router.get('/live/:classId/me', isAuthenticated, getMyProgress);

// Coach controls
router.post('/coach/live/:classId/start', isAuthenticated, roles(['coach']), startLiveClass);
router.post('/coach/live/:classId/stop',  isAuthenticated, roles(['coach']), stopLiveClass);

// Member (FOR_TIME/AMRAP)
router.post('/live/:classId/advance', isAuthenticated, advanceProgress);
router.post('/live/:classId/partial', isAuthenticated, submitPartial);

// HTTP fallback leaderboard for FOR_TIME
router.get('/live/:classId/leaderboard', isAuthenticated, getRealtimeLeaderboard);

// INTERVAL/TABATA
router.post('/live/:classId/interval/score', isAuthenticated, postIntervalScore);
router.get('/live/:classId/interval/leaderboard', isAuthenticated, getIntervalLeaderboard);

export default router;
