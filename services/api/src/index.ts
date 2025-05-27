// === services/api/src/index.ts ===
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth';
import scheduleRoutes from './routes/schedule';
import classRoutes from './routes/classes';


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(authRoutes)
app.use(scheduleRoutes);
app.use(classRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

