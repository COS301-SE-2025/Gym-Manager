// === services/api/src/routes/ongoingClass.ts ===
import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { roles } from '../middleware/roles';

import {
  // existing:
  getLeaderboard,
  getLiveClass,
  submitScore,
  // new:
  startLiveClass,
  stopLiveClass,
  advanceProgress,
  submitPartial,
  getRealtimeLeaderboard,
  getWorkoutSteps,
  getMyProgress,
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

// Member actions
router.post('/live/:classId/advance', isAuthenticated, advanceProgress);
router.post('/live/:classId/partial', isAuthenticated, submitPartial);

// Optional HTTP fallback
router.get('/live/:classId/leaderboard', isAuthenticated, getRealtimeLeaderboard);

export default router;
