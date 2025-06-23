// === services/api/src/routes/ongoingClass.ts ===
import express from 'express';
import { getLeaderboard, getCurrentClass } from '../controllers/ongoingClassController';
import { isAuthenticated } from '../middleware/auth';
// import { is } from 'drizzle-orm';

const router = express.Router();

router.get('/leaderboard/:classId', isAuthenticated, getLeaderboard);
router.get('/getCurrentClass', isAuthenticated, getCurrentClass);


export default router;
