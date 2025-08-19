// === services/api/src/index.ts ===
import dotenv from 'dotenv';
dotenv.config();
import cors, { CorsOptions } from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import adminRoutes from './routes/admin';
import classRoutes from './routes/classes';
import authRoutes from './routes/auth';
import ongoingClassRoutes from './routes/ongoingClass';
// import liveRoutes from './routes/live';  // REMOVED
import userSettingsRoutes from './routes/userSettings';
import healthRoutes from './routes/health';
import { requestTimeout } from './middleware/requestTimeout';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger';
import './listeners/adminNotificationListener';

const app = express();
const port = process.env.PORT || 4000;


const allowedOrigins = [
  'http://localhost:3000',
  'https://gym-manager-ashen.vercel.app',
]

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};


// CORS must run before any other routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: any, req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

export { app };
export default app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
