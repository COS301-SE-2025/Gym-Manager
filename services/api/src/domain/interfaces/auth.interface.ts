import { User, UserWithRoles, UserRegistrationData, UserLoginData, AuthResult } from '../entities/user.entity';

export interface IAuthService {
  register(userData: UserRegistrationData): Promise<AuthResult>;
  login(loginData: UserLoginData): Promise<AuthResult>;
  getUserStatus(userId: number): Promise<{ userId: number; roles: string[]; membershipStatus: string }>;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(userId: number): Promise<User | null>;
  createUser(userData: Omit<User, 'userId'>): Promise<User>;
  createUserWithRoles(userData: Omit<User, 'userId'>, roles: string[]): Promise<User>;
  getRolesByUserId(userId: number): Promise<string[]>;
  getMemberStatus(userId: number): Promise<string | null>;
}

export interface IJwtService {
  generateToken(payload: object): string;
  verifyToken(token: string): any;
}

export interface IPasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
}
