// === services/api/src/routes/auth.ts ===
import express from 'express';
import { getLeaderboard } from '../controllers/ongoingClassController';
import { getLiveClass } from '../controllers/ongoingClassController';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.get('/leaderboard', isAuthenticated, getLeaderboard);
router.get('/live/class', isAuthenticated, getLiveClass);

export default router;
