import { Router } from 'express';
import { getLogs } from '../../controllers/analytics/analyticsController';
import { requireRole } from '../../infrastructure/middleware/authMiddleware';

const router = Router();

router.get('/logs', requireRole('admin'), getLogs);

export default router;
