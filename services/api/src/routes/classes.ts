// === apps/api/src/routes/classes.ts ===
import express from 'express';
import { viewClasses, bookClass } from '../controllers/classController';
import { requireRole } from '../middleware/roles';
const router = express.Router();

router.get('/', viewClasses);
router.post('/:id/book', requireRole('member'), bookClass);

export default router;