// === services/api/src/routes/classes.ts ===
import express from 'express';
import { createClass } from '../controllers/classController';

import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/classes', isAuthenticated, createClass);

export default router;
