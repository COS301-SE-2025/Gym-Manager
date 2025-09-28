import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import { DependencyContainer } from './infrastructure/container/dependencyContainer';
import { requestTimeout } from './middleware/requestTimeout';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger';

export class App {
  private app: express.Application;
  private container: DependencyContainer;

  constructor() {
    this.app = express();
    this.container = DependencyContainer.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    const allowedOrigins = [
      'http://localhost:3000',
      'https://gym-manager-ashen.vercel.app',
      'https://gym-manager-web.vercel.app',
    ];

    const corsOptions: CorsOptions = {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        callback(null, allowedOrigins.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200,
    };

    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use(requestTimeout(20_000));
  }

  private setupRoutes(): void {
    
    const authRoutes = this.container.getAuthRoutes();
    const classRoutes = this.container.getClassRoutes();
    const adminRoutes = this.container.getAdminRoutes();
    const liveClassRoutes = this.container.getLiveClassRoutes();
    const userSettingsRoutes = this.container.getUserSettingsRoutes();
    const healthRoutes = this.container.getHealthRoutes();
    const memberRoutes = this.container.getMemberRoutes();
    const analyticsRoutes = this.container.getAnalyticsRoutes();
    const paymentPackagesRoutes = this.container.getPaymentPackagesRoutes();
    const gamificationRoutes = this.container.getGamificationRoutes();
    
    const dailyLeaderboardRoutes = this.container.getDailyLeaderboardRoutes();
    
    
    this.app.use(authRoutes.getRouter());
    this.app.use(classRoutes.getRouter());
    this.app.use(adminRoutes.getRouter());
    this.app.use(liveClassRoutes.getRouter());
    this.app.use(userSettingsRoutes.getRouter());
    this.app.use(healthRoutes.getRouter());
    this.app.use(dailyLeaderboardRoutes.getRouter());
    this.app.use('/members', memberRoutes.getRouter());
    this.app.use('/analytics', analyticsRoutes.getRouter());
    this.app.use('/payments', paymentPackagesRoutes.getRouter());
    this.app.use('/gamification', gamificationRoutes.getRouter());
    
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    
    setupSwagger(this.app as any);
    
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    this.app.use(errorHandler);
  }

  getApp(): express.Application {
    return this.app;
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
    });
  }
}

export default App;
