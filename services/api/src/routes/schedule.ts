// === services/api/src/routes/schedule.ts ===
import express from 'express';
import { createSchedule } from '../controllers/scheduleController';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/schedule', isAuthenticated, createSchedule);

export default router;

