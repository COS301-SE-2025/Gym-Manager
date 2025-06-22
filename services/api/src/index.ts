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


const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true,
}));
app.use(bodyParser.json());
app.use(authRoutes);
app.use(scheduleRoutes);
app.use(classRoutes);
app.use(ongoingClassRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

