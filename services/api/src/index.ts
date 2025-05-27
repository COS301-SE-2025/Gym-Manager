// === services/api/src/index.ts ===
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import classRoutes from './routes/classes';
import scheduleRoutes from './routes/schedule';
import { authMiddleware } from './middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/classes', authMiddleware, classRoutes);
app.use('/schedule', authMiddleware, scheduleRoutes);

app.listen(3001, () => console.log('API running on http://localhost:3001'));