// === services/api/src/routes/auth.ts ===
import express from 'express';
import { register, login, getStatus } from '../controllers/authController';
import { isAuthenticated } from '../middleware/auth';


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get ('/status', isAuthenticated, getStatus);

export default router;
