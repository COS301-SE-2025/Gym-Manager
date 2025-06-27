// === services/api/src/routes/health.ts ===
import express from 'express';
import { healthCheck } from '../controllers/healthController';

const router = express.Router();

// 200 -> all good
// 503 -> DB (or Node) problem

router.get('/healthz', healthCheck);
router.get('/health', healthCheck); 
router.get('/ready', healthCheck);

export default router;
