// === services/api/src/routes/ongoingClass.ts ===
import express from 'express';
import { getLeaderboard, getLiveClass, submitScore } from '../controllers/ongoingClassController';
import { isAuthenticated } from '../middleware/auth';
// import { is } from 'drizzle-orm';

const router = express.Router();

router.get('/live/class', isAuthenticated, getLiveClass);
router.get('/leaderboard/:classId', isAuthenticated, getLeaderboard);
router.post('/submitScore', isAuthenticated, submitScore);

export default router;
