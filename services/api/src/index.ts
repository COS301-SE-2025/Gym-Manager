// === services/api/src/index.ts ===
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import scheduleRoutes from './routes/schedule';
import classRoutes from './routes/classes';
import authRoutes from './routes/auth';
import ongoingClassRoutes from './routes/ongoingClass';
import userSettingsRoutes from "./routes/userSettings";
import healthRoutes   from './routes/health';





const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true,
}));
app.use(bodyParser.json());
app.use(healthRoutes);
app.use(authRoutes);
app.use(scheduleRoutes);
app.use(classRoutes);
app.use(ongoingClassRoutes);
app.use(userSettingsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log("Ongoing class routes loaded");

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