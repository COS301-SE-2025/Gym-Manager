import {
  IAuthService,
  IUserRepository,
  IJwtService,
  IPasswordService,
  IMfaService,
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
import { MfaService } from '../../infrastructure/auth/mfaService';
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
  private mfaService: IMfaService;
  private notificationService: NotificationService;
  private analyticsService: AnalyticsService;

  constructor(
    userRepository?: IUserRepository,
    jwtService?: IJwtService,
    passwordService?: IPasswordService,
    mfaService?: IMfaService,
    notificationService?: NotificationService,
    analyticsService?: AnalyticsService,
  ) {
    this.userRepository = userRepository || new UserRepository();
    this.jwtService = jwtService || new JwtService();
    this.passwordService = passwordService || new PasswordService();
    this.mfaService = mfaService || new MfaService();
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

  async login(loginData: UserLoginData & { mfaToken?: string; mfaBackupCode?: string }): Promise<AuthResult> {
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

    // Check if MFA is enabled
    const mfaSettings = await this.userRepository.getMfaSettings(user.userId);
    if (mfaSettings.mfaEnabled) {
      // MFA is required - verify token or backup code
      if (!loginData.mfaToken && !loginData.mfaBackupCode) {
        throw new Error('MFA token required');
      }

      let mfaValid = false;
      if (loginData.mfaToken) {
        mfaValid = await this.verifyMfaToken(user.userId, loginData.mfaToken);
      } else if (loginData.mfaBackupCode) {
        mfaValid = await this.verifyMfaBackupCode(user.userId, loginData.mfaBackupCode);
      }

      if (!mfaValid) {
        throw new Error('Invalid MFA token or backup code');
      }
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

  // Password change functionality
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Get user to verify current password
    const user = await this.userRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);

    // Log password change event
    await this.analyticsService.addLog({
      gymId: 1,
      userId,
      eventType: 'password_changed',
      properties: {},
      source: 'api',
    });
  }

  // MFA functionality
  async generateMfaSecret(userId: number): Promise<{ secret: string; qrCode: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const secret = this.mfaService.generateSecret(user.email);
    const qrCode = await this.mfaService.generateQRCode(secret, user.email);

    return { secret, qrCode };
  }

  async enableMfa(userId: number, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new secret and verify token
    const secret = this.mfaService.generateSecret(user.email);
    const isValidToken = this.mfaService.verifyToken(token, secret);
    if (!isValidToken) {
      throw new Error('Invalid MFA token');
    }

    // Generate backup codes
    const backupCodes = this.mfaService.generateBackupCodes();

    // Update user MFA settings
    await this.userRepository.updateMfaSettings(userId, true, secret, backupCodes);

    // Log MFA enablement
    await this.analyticsService.addLog({
      gymId: 1,
      userId,
      eventType: 'mfa_enabled',
      properties: {},
      source: 'api',
    });

    return { backupCodes };
  }

  async disableMfa(userId: number, token: string): Promise<void> {
    const mfaSettings = await this.userRepository.getMfaSettings(userId);
    if (!mfaSettings.mfaEnabled || !mfaSettings.mfaSecret) {
      throw new Error('MFA is not enabled');
    }

    // Verify token before disabling
    const isValidToken = this.mfaService.verifyToken(token, mfaSettings.mfaSecret);
    if (!isValidToken) {
      throw new Error('Invalid MFA token');
    }

    // Disable MFA
    await this.userRepository.updateMfaSettings(userId, false);

    // Log MFA disablement
    await this.analyticsService.addLog({
      gymId: 1,
      userId,
      eventType: 'mfa_disabled',
      properties: {},
      source: 'api',
    });
  }

  async verifyMfaToken(userId: number, token: string): Promise<boolean> {
    const mfaSettings = await this.userRepository.getMfaSettings(userId);
    if (!mfaSettings.mfaEnabled || !mfaSettings.mfaSecret) {
      return false;
    }

    return this.mfaService.verifyToken(token, mfaSettings.mfaSecret);
  }

  async verifyMfaBackupCode(userId: number, backupCode: string): Promise<boolean> {
    const mfaSettings = await this.userRepository.getMfaSettings(userId);
    if (!mfaSettings.mfaEnabled || !mfaSettings.backupCodes) {
      return false;
    }

    const isValid = this.mfaService.verifyBackupCode(backupCode, mfaSettings.backupCodes);
    if (isValid) {
      // Update backup codes (remove used one)
      await this.userRepository.updateMfaSettings(userId, true, undefined, mfaSettings.backupCodes);
    }

    return isValid;
  }

  async getMfaStatus(userId: number): Promise<{ mfaEnabled: boolean }> {
    const mfaSettings = await this.userRepository.getMfaSettings(userId);
    return { mfaEnabled: mfaSettings.mfaEnabled };
  }
}
