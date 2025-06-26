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
import userSettingsRoutes from "./routes/userSettings";
import healthRoutes   from './routes/health';
import { requestTimeout } from './middleware/requestTimeout';
import { errorHandler   } from './middleware/errorHandler';
import { setupSwagger } from './swagger';




const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

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

// Export the app for testing
export { app };

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});