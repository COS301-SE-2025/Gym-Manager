// === services/api/src/routes/auth.ts ===
import express from 'express';
import { getLeaderboard } from '../controllers/ongoingClassController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;
