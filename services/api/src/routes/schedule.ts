// === services/api/src/routes/schedule.ts ===
import express from 'express';
import { createSchedule, assignCoach, createClass } from '../controllers/scheduleController';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/schedule/create', isAuthenticated, createClass);
router.post('/schedule/assign-coach', isAuthenticated, assignCoach);

export default router;

