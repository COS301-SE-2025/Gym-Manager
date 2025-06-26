// === services/api/src/index.ts ===
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { setupSwagger } from './swagger';
import express from 'express';
import bodyParser from 'body-parser';
import adminRoutes from './routes/admin';
import classRoutes from './routes/classes';
import authRoutes from './routes/auth';

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(authRoutes);
app.use(adminRoutes);
app.use(classRoutes);
setupSwagger(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export { app }; // Export the app for testing purposes
