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

const allowedOrigins = [
  'http://localhost:3000',
  'https://api-green-zeta-48.vercel.app', // VERCEL DEPLOYMENT
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow Postman/cURL
      cb(null, allowedOrigins.includes(origin)); // allow only listed origins
    },
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(requestTimeout(20_000));
app.use(healthRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(classRoutes);
app.use(ongoingClassRoutes);
app.use(userSettingsRoutes);
app.use(errorHandler);
setupSwagger(app);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// Export the app for testing
export { app };
export default app;


if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
