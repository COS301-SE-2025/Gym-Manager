import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import { DependencyContainer } from './infrastructure/container/dependencyContainer';
import { requestTimeout } from './middleware/requestTimeout';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger';

/**
 * Main Application - Entry Point
 * Demonstrates how to use the layered architecture
 */
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
    // Security middleware
    this.app.use(helmet());
    // CORS configuration to match previous Vercel-compatible setup
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

    // CORS must run before any other routes
    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));
    
    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request timeout middleware (20 seconds like the old version)
    this.app.use(requestTimeout(20_000));
  }

  private setupRoutes(): void {

    
    // Get routes from dependency container
    const authRoutes = this.container.getAuthRoutes();
    const classRoutes = this.container.getClassRoutes();
    const adminRoutes = this.container.getAdminRoutes();
    const liveClassRoutes = this.container.getLiveClassRoutes();
    const userSettingsRoutes = this.container.getUserSettingsRoutes();
    const healthRoutes = this.container.getHealthRoutes();
    const memberRoutes = this.container.getMemberRoutes();
    

    const dailyLeaderboardRoutes = this.container.getDailyLeaderboardRoutes();

    
    // Mount routes
    this.app.use(authRoutes.getRouter());
    this.app.use(classRoutes.getRouter());
    this.app.use(adminRoutes.getRouter());
    this.app.use(liveClassRoutes.getRouter());
    this.app.use(userSettingsRoutes.getRouter());
    this.app.use(healthRoutes.getRouter());
    

    this.app.use(dailyLeaderboardRoutes.getRouter());

    
    this.app.use('/members', memberRoutes.getRouter());
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    
    // Setup Swagger documentation
    setupSwagger(this.app as any);
    
    // 404 handler - must be after all routes
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    // Error handler - must be last
    this.app.use(errorHandler);
  }

  getApp(): express.Application {
    return this.app;
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log('Layered Architecture Demo:');
      console.log('- Presentation Layer: Routes handle HTTP concerns');
      console.log('- Controller Layer: Controllers handle request/response');
      console.log('- Service Layer: Business logic and orchestration');
      console.log('- Repository Layer: Data access and persistence');
      console.log('- Infrastructure Layer: External concerns (JWT, passwords, etc.)');
      console.log('');
      console.log('Available endpoints:');
      console.log('- /auth/* - Authentication endpoints');
      console.log('- /classes/* - Class management endpoints');
      console.log('- /admin/* - Admin management endpoints');
      console.log('- /live/* - Live class endpoints');
      console.log('- /settings/* - User settings endpoints');
      console.log('- /members/* - Member management endpoints');
      console.log('- /health - Health check endpoint');
    });
  }
}

// Export for use in index.ts
export default App;
