// === services/api/src/routes/auth.ts ===
import express from 'express';
import { getLeaderboard } from '../controllers/ongoingClassController';
import { getCurrentClass } from '../controllers/ongoingClassController';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.get('/leaderboard', isAuthenticated, getLeaderboard);
router.get('/getCurrentClass', isAuthenticated, getCurrentClass);

export default router;
