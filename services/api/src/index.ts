// === services/api/src/index.ts ===
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import adminRoutes from './routes/admin';
import classRoutes from './routes/classes';
import authRoutes from './routes/auth';
import ongoingClassRoutes from './routes/ongoingClass';
import userSettingsRoutes from './routes/userSettings';
import healthRoutes from './routes/health';
import { requestTimeout } from './middleware/requestTimeout';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger';

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(requestTimeout(10_000));
app.use(healthRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(classRoutes);
app.use(ongoingClassRoutes);
app.use(userSettingsRoutes);
app.use(errorHandler);
setupSwagger(app);

// 404 Handler
app.use((_req, res, _next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export the app for testing / Vercel
export { app };
export default app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
