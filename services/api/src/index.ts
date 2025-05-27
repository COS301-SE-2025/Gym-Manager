// === services/api/src/index.ts ===
import express from 'express';
import bodyParser from 'body-parser';
import scheduleRoutes from './routes/schedule';
import classRoutes from './routes/classes';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(scheduleRoutes);
app.use(classRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

