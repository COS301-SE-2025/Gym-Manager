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
const app2 = express(); // This seems unused, but keeping it for consistency with the original code
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

app2.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);
app2.use(bodyParser.json());
// app2 is not used in the original code, so it can be removed or repurposed as needed
app2.use(authRoutes);
app2.use(adminRoutes);
app2.use(classRoutes);  


// Export the app for testing
export { app };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
