// === services/api/src/routes/schedule.ts ===
import express from 'express';
import { createSchedule, assignCoach } from '../controllers/scheduleController';
import { requireRole } from '../middleware/roles';
const router = express.Router();

router.post('/', requireRole('manager'), createSchedule);
router.patch('/:id/assign-coach', requireRole('manager'), assignCoach);

export default router;