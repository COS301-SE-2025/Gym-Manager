import { AuthController } from '../../controllers/auth/authController';
import { AuthService } from '../../services/auth/authService';
import { UserRepository } from '../../repositories/auth/userRepository';
import { JwtService } from '../auth/jwtService';
import { PasswordService } from '../auth/passwordService';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { AuthRoutes } from '../../presentation/auth/authRoutes';

// Class-related imports
import { ClassController } from '../../controllers/class/classController';
import { ClassService } from '../../services/class/classService';
import { ClassRepository } from '../../repositories/class/classRepository';
import { ClassRoutes } from '../../presentation/class/classRoutes';

// Admin-related imports
import { AdminController } from '../../controllers/admin/adminController';
import { AdminService } from '../../services/admin/adminService';
import { AdminRepository } from '../../repositories/admin/adminRepository';
import { AdminRoutes } from '../../presentation/admin/adminRoutes';

// Analytics-related imports
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { AnalyticsRepository } from '../../repositories/analytics/analyticsRepository';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.interface';
import { IAnalyticsService } from '../../domain/interfaces/analytics.interface';
// Live class-related imports
import { LiveClassController } from '../../controllers/liveClass/liveClassController';
import { LiveClassService } from '../../services/liveClass/liveClassService';
import { LiveClassRepository } from '../../repositories/liveClass/liveClassRepository';
import { LiveClassRoutes } from '../../presentation/liveClass/liveClassRoutes';

// User settings-related imports
import { UserSettingsController } from '../../controllers/userSettings/userSettingsController';
import { UserSettingsService } from '../../services/userSettings/userSettingsService';
import { UserSettingsRepository } from '../../repositories/userSettings/userSettingsRepository';
import { UserSettingsRoutes } from '../../presentation/userSettings/userSettingsRoutes';

// Health-related imports
import { HealthController } from '../../controllers/health/healthController';
import { HealthService } from '../../services/health/healthService';
import { HealthRepository } from '../../repositories/health/healthRepository';
import { HealthRoutes } from '../../presentation/health/healthRoutes';
import { NotificationService } from '../../services/notifications/notificationService';
import { NotificationRepository } from '../../repositories/notifications/notificationRepository';

// Daily Leaderboard-related imports
import { DailyLeaderboardController } from '../../controllers/dailyLeaderboard/dailyLeaderboardController';
import { DailyLeaderboardService } from '../../services/dailyLeaderboard/dailyLeaderboardService';
import { DailyLeaderboardRepository } from '../../repositories/dailyLeaderboard/dailyLeaderboardRepository';
import { DailyLeaderboardRoutes } from '../../presentation/dailyLeaderboard/dailyLeaderboardRoutes';

// Member-related imports
import { MemberController } from '../../controllers/member/memberController';
import { MemberService } from '../../services/member/memberService';
import { MemberRepository } from '../../repositories/member/memberRepository';
import { MemberRoutes } from '../../presentation/member/memberRoutes';

// Analytics-related imports
import { AnalyticsController } from '../../controllers/analytics/analyticsController';
import { AnalyticsRoutes } from '../../presentation/analytics/analyticsRoutes';

// Payment Packages-related imports
import { PaymentPackagesController } from '../../controllers/paymentPackages/paymentPackagesController';
import { PaymentPackagesService } from '../../services/paymentPackages/paymentPackagesService';
import { PaymentPackagesRoutes } from '../../presentation/paymentPackages/paymentPackagesRoutes';

// Gamification-related imports
import { GamificationController } from '../../controllers/gamification/gamificationController';
import { GamificationService } from '../../services/gamification/gamificationService';
import { GamificationRepository } from '../../repositories/gamification/gamificationRepository';
import { GamificationRoutes } from '../../presentation/gamification/gamificationRoutes';

// Schedule Template-related imports
import { ScheduleTemplateController } from '../../controllers/scheduleTemplate/scheduleTemplateController';
import { ScheduleTemplateService } from '../../services/scheduleTemplate/scheduleTemplateService';
import { ScheduleTemplateRepository } from '../repositories/scheduleTemplateRepository';
import { ScheduleTemplateRoutes } from '../../presentation/scheduleTemplate/scheduleTemplateRoutes';

/**
 * Dependency Container - Infrastructure Layer
 * Manages dependency injection and object creation
 */
export class DependencyContainer {
  private static instance: DependencyContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  private initializeServices(): void {
    // Infrastructure services
    this.services.set('jwtService', new JwtService());
    this.services.set('passwordService', new PasswordService());
    this.services.set('authMiddleware', new AuthMiddleware());

    // Repository layer
    this.services.set('userRepository', new UserRepository());
    this.services.set('classRepository', new ClassRepository());
    this.services.set('adminRepository', new AdminRepository());
    this.services.set('liveClassRepository', new LiveClassRepository());
    this.services.set('userSettingsRepository', new UserSettingsRepository());
    this.services.set('healthRepository', new HealthRepository());
    this.services.set('notificationRepository', new NotificationRepository());
    this.services.set('dailyLeaderboardRepository', new DailyLeaderboardRepository());
    this.services.set('memberRepository', new MemberRepository());
    this.services.set('gamificationRepository', new GamificationRepository());
    this.services.set('scheduleTemplateRepository', new ScheduleTemplateRepository());

    // Service layer
    this.services.set(
      'authService',
      new AuthService(
        this.services.get('userRepository'),
        this.services.get('jwtService'),
        this.services.get('passwordService'),
        this.services.get('notificationService'),
        this.services.get('analyticsService'),
      ),
    );

    this.services.set(
      'classService',
      new ClassService(
        this.services.get('classRepository'),
        this.services.get('userRepository'),
        this.services.get('memberService'),
        this.services.get('analyticsService'),
      ),
    );

    this.services.set(
      'adminService',
      new AdminService(this.services.get('adminRepository'), this.services.get('analyticsService')),
    );

    this.services.set(
      'liveClassService',
      new LiveClassService(this.services.get('liveClassRepository')),
    );

    this.services.set(
      'userSettingsService',
      new UserSettingsService(this.services.get('userSettingsRepository')),
    );

    this.services.set('healthService', new HealthService(this.services.get('healthRepository')));

    this.services.set(
      'notificationService',
      new NotificationService(this.services.get('notificationRepository')),
    );

    this.services.set(
      'dailyLeaderboardService',
      new DailyLeaderboardService(this.services.get('dailyLeaderboardRepository')),
    );

    this.services.set(
      'memberService',
      new MemberService(
        this.services.get('memberRepository'),
        this.services.get('paymentPackagesService'),
      ),
    );

    this.services.set(
      'gamificationService',
      new GamificationService(this.services.get('gamificationRepository')),
    );

    this.services.set(
      'scheduleTemplateService',
      new ScheduleTemplateService(this.services.get('scheduleTemplateRepository')),
    );

    // Analytics service
    this.services.set('analyticsRepository', new AnalyticsRepository());
    this.services.set(
      'analyticsService',
      new AnalyticsService(this.services.get('analyticsRepository')),
    );
    this.services.set('paymentPackagesService', new PaymentPackagesService());
    // Controller layer
    this.services.set('authController', new AuthController(this.services.get('authService')));

    this.services.set('classController', new ClassController(this.services.get('classService')));

    this.services.set('adminController', new AdminController(this.services.get('adminService')));

    this.services.set(
      'liveClassController',
      new LiveClassController(this.services.get('liveClassService')),
    );

    this.services.set(
      'userSettingsController',
      new UserSettingsController(this.services.get('userSettingsService')),
    );

    this.services.set('healthController', new HealthController(this.services.get('healthService')));

    this.services.set(
      'dailyLeaderboardController',
      new DailyLeaderboardController(this.services.get('dailyLeaderboardService')),
    );

    this.services.set('memberController', new MemberController(this.services.get('memberService')));

    this.services.set(
      'analyticsController',
      new AnalyticsController(this.services.get('analyticsService')),
    );

    this.services.set(
      'paymentPackagesController',
      new PaymentPackagesController(this.services.get('paymentPackagesService')),
    );

    this.services.set(
      'gamificationController',
      new GamificationController(this.services.get('gamificationService')),
    );

    this.services.set(
      'scheduleTemplateController',
      new ScheduleTemplateController(this.services.get('scheduleTemplateService')),
    );

    // Presentation layer
    this.services.set('authRoutes', new AuthRoutes());
    this.services.set('classRoutes', new ClassRoutes());
    this.services.set('adminRoutes', new AdminRoutes());
    this.services.set('liveClassRoutes', new LiveClassRoutes());
    this.services.set('userSettingsRoutes', new UserSettingsRoutes());
    this.services.set('healthRoutes', new HealthRoutes());

    this.services.set('dailyLeaderboardRoutes', new DailyLeaderboardRoutes());
    this.services.set('memberRoutes', new MemberRoutes(this.services.get('memberController')));

    this.services.set('analyticsRoutes', new AnalyticsRoutes());
    this.services.set('paymentPackagesRoutes', new PaymentPackagesRoutes());
    this.services.set(
      'gamificationRoutes',
      new GamificationRoutes(this.services.get('gamificationController')),
    );

    this.services.set(
      'scheduleTemplateRoutes',
      new ScheduleTemplateRoutes(this.services.get('scheduleTemplateController')),
    );
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }

  // Convenience methods for common services
  getAuthRoutes(): AuthRoutes {
    return this.get<AuthRoutes>('authRoutes');
  }

  getClassRoutes(): ClassRoutes {
    return this.get<ClassRoutes>('classRoutes');
  }

  getAdminRoutes(): AdminRoutes {
    return this.get<AdminRoutes>('adminRoutes');
  }

  getLiveClassRoutes(): LiveClassRoutes {
    return this.get<LiveClassRoutes>('liveClassRoutes');
  }

  getUserSettingsRoutes(): UserSettingsRoutes {
    return this.get<UserSettingsRoutes>('userSettingsRoutes');
  }

  getHealthRoutes(): HealthRoutes {
    return this.get<HealthRoutes>('healthRoutes');
  }

  getMemberRoutes(): MemberRoutes {
    return this.get<MemberRoutes>('memberRoutes');
  }

  getAuthController(): AuthController {
    return this.get<AuthController>('authController');
  }

  getClassController(): ClassController {
    return this.get<ClassController>('classController');
  }

  getAdminController(): AdminController {
    return this.get<AdminController>('adminController');
  }

  getLiveClassController(): LiveClassController {
    return this.get<LiveClassController>('liveClassController');
  }

  getUserSettingsController(): UserSettingsController {
    return this.get<UserSettingsController>('userSettingsController');
  }

  getHealthController(): HealthController {
    return this.get<HealthController>('healthController');
  }

  getAuthService(): AuthService {
    return this.get<AuthService>('authService');
  }

  getClassService(): ClassService {
    return this.get<ClassService>('classService');
  }

  getAdminService(): AdminService {
    return this.get<AdminService>('adminService');
  }

  getLiveClassService(): LiveClassService {
    return this.get<LiveClassService>('liveClassService');
  }

  getUserSettingsService(): UserSettingsService {
    return this.get<UserSettingsService>('userSettingsService');
  }

  getHealthService(): HealthService {
    return this.get<HealthService>('healthService');
  }

  getAuthMiddleware(): AuthMiddleware {
    return this.get<AuthMiddleware>('authMiddleware');
  }

  getDailyLeaderboardRoutes(): DailyLeaderboardRoutes {
    return this.get<DailyLeaderboardRoutes>('dailyLeaderboardRoutes');
  }

  getMemberService(): MemberService {
    return this.get<MemberService>('memberService');
  }

  getMemberRepository(): MemberRepository {
    return this.get<MemberRepository>('memberRepository');
  }

  getAnalyticsRoutes(): AnalyticsRoutes {
    return this.get<AnalyticsRoutes>('analyticsRoutes');
  }

  getPaymentPackagesRoutes(): PaymentPackagesRoutes {
    return this.get<PaymentPackagesRoutes>('paymentPackagesRoutes');
  }

  getGamificationRoutes(): GamificationRoutes {
    return this.get<GamificationRoutes>('gamificationRoutes');
  }

  getScheduleTemplateRoutes(): ScheduleTemplateRoutes {
    return this.get<ScheduleTemplateRoutes>('scheduleTemplateRoutes');
  }
}
