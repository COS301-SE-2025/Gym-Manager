import {
  IAuthService,
  IUserRepository,
  IJwtService,
  IPasswordService,
} from '../../domain/interfaces/auth.interface';
import {
  UserRegistrationData,
  UserLoginData,
  AuthResult,
  UserWithRoles,
} from '../../domain/entities/user.entity';
import { UserRepository } from '../../repositories/auth/userRepository';
import { JwtService } from '../../infrastructure/auth/jwtService';
import { PasswordService } from '../../infrastructure/auth/passwordService';
import { NotificationService } from '../notifications/notificationService';
import { AnalyticsService } from '../analytics/analyticsService';

/**
 * AuthService - Business Layer
 * Contains all business logic for authentication operations
 */
export class AuthService implements IAuthService {
  private userRepository: IUserRepository;
  private jwtService: IJwtService;
  private passwordService: IPasswordService;
  private notificationService: NotificationService;
  private analyticsService: AnalyticsService;

  constructor(
    userRepository?: IUserRepository,
    jwtService?: IJwtService,
    passwordService?: IPasswordService,
    notificationService?: NotificationService,
    analyticsService?: AnalyticsService,
  ) {
    this.userRepository = userRepository || new UserRepository();
    this.jwtService = jwtService || new JwtService();
    this.passwordService = passwordService || new PasswordService();
    this.notificationService = notificationService || new NotificationService();
    this.analyticsService = analyticsService || new AnalyticsService();
  }

  async register(userData: UserRegistrationData): Promise<AuthResult> {
    // Validate required fields
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
      throw new Error('Missing required fields');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(userData.password);

    // Create user with roles
    const roles = userData.roles || ['member'];
    const createdUser = await this.userRepository.createUserWithRoles(
      {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        passwordHash,
      },
      roles,
    );

    // Emit admin notification for approval
    await this.notificationService.createUserSignupNotification(createdUser);

    // Log user sign up event
    await this.analyticsService.addLog({
      gymId: 1, // Assuming a single gym for now
      userId: createdUser.userId,
      eventType: 'user_signup',
      properties: {
        email: userData.email,
        roles: roles,
      },
      source: 'api',
    });

    // Get roles for token generation
    const assignedRoles = await this.userRepository.getRolesByUserId(createdUser.userId);

    // Generate tokens
    const token = this.jwtService.generateToken({
      userId: createdUser.userId,
      roles: assignedRoles,
    });
    const refreshToken = this.jwtService.generateRefreshToken({ userId: createdUser.userId });

    return { token, refreshToken };
  }

  async login(loginData: UserLoginData): Promise<AuthResult> {
    // Validate required fields
    if (!loginData.email || !loginData.password) {
      throw new Error('Missing credentials');
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    if (!user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const passwordValid = await this.passwordService.verifyPassword(
      loginData.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Get user roles
    const roles = await this.userRepository.getRolesByUserId(user.userId);

    // Log admin login
    if (roles.includes('admin')) {
      await this.analyticsService.addLog({
        gymId: 1, // Assuming a single gym for now
        userId: user.userId,
        eventType: 'admin_login',
        properties: {},
        source: 'api',
      });
    }
    // Generate tokens
    const token = this.jwtService.generateToken({
      userId: user.userId,
      roles,
    });
    const refreshToken = this.jwtService.generateRefreshToken({ userId: user.userId });

    // Create user with roles for response (sanitize passwordHash)
    const { passwordHash: _omit, ...userSafe } = user;
    const userWithRoles: UserWithRoles = {
      ...(userSafe as any),
      roles,
    };

    return {
      token,
      refreshToken,
      user: userWithRoles,
    };
  }

  async refresh(accessToken: string | null, refreshToken: string): Promise<AuthResult> {
    // Validate refresh token
    const decoded = this.jwtService.verifyRefreshToken(refreshToken) as { userId: number };
    const userId = decoded.userId;

    // Optional: check if access token is close to expiry or invalid; we simply issue a new one
    const roles = await this.userRepository.getRolesByUserId(userId);
    const newAccessToken = this.jwtService.generateToken({ userId, roles });
    const newRefreshToken = this.jwtService.generateRefreshToken({ userId });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async getUserStatus(
    userId: number,
  ): Promise<{ userId: number; roles: string[]; membershipStatus: string }> {
    // Get user roles
    const roles = await this.userRepository.getRolesByUserId(userId);

    // Get membership status if user has member role
    let membershipStatus = 'visitor';
    if (roles.includes('member')) {
      const status = await this.userRepository.getMemberStatus(userId);
      membershipStatus = status ?? 'pending';
    }

    return { userId, roles, membershipStatus };
  }

  async getMe(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const roles = await this.userRepository.getRolesByUserId(userId);
    const { passwordHash: _omit, ...userSafe } = user as any;
    return { ...userSafe, roles };
  }
}
