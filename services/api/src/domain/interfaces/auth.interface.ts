import {
  User,
  UserWithRoles,
  UserRegistrationData,
  UserLoginData,
  AuthResult,
} from '../entities/user.entity';

export interface IAuthService {
  register(userData: UserRegistrationData): Promise<AuthResult>;
  login(loginData: UserLoginData): Promise<AuthResult>;
  refresh(accessToken: string | null, refreshToken: string): Promise<AuthResult>;
  getUserStatus(
    userId: number,
  ): Promise<{ userId: number; roles: string[]; membershipStatus: string }>;
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
  enableMfa(userId: number, token: string): Promise<{ backupCodes: string[] }>;
  disableMfa(userId: number, token: string): Promise<void>;
  verifyMfaToken(userId: number, token: string): Promise<boolean>;
  generateMfaSecret(userId: number): Promise<{ secret: string; qrCode: string }>;
  verifyMfaBackupCode(userId: number, backupCode: string): Promise<boolean>;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(userId: number): Promise<User | null>;
  createUser(userData: Omit<User, 'userId'>): Promise<User>;
  createUserWithRoles(userData: Omit<User, 'userId'>, roles: string[]): Promise<User>;
  getRolesByUserId(userId: number): Promise<string[]>;
  getMemberStatus(userId: number): Promise<string | null>;
  updatePassword(userId: number, newPasswordHash: string): Promise<void>;
  updateMfaSettings(userId: number, mfaEnabled: boolean, mfaSecret?: string, backupCodes?: string[]): Promise<void>;
  getMfaSettings(userId: number): Promise<{ mfaEnabled: boolean; mfaSecret?: string; backupCodes?: string[] }>;
}

export interface IJwtService {
  generateToken(payload: object): string;
  verifyToken(token: string): any;
  generateRefreshToken(payload: object): string;
  verifyRefreshToken(token: string): any;
}

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
}

export interface IMfaService {
  generateSecret(userEmail: string, serviceName?: string): string;
  generateQRCode(secret: string, userEmail: string, serviceName?: string): Promise<string>;
  verifyToken(token: string, secret: string): boolean;
  generateBackupCodes(count?: number): string[];
  verifyBackupCode(code: string, backupCodes: string[]): boolean;
}
