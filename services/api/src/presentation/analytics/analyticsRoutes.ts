import { Router } from 'express';
import { getLogs, getSummaryStats } from '../../controllers/analytics/analyticsController';
import { requireRole } from '../../infrastructure/middleware/authMiddleware';

const router = Router();

router.get('/logs', requireRole('admin'), getLogs);
router.get('/summary-stats', requireRole('admin'), getSummaryStats);

export default router;
