// tests/unit/services/authService.test.ts
import { AuthService } from '../../../services/auth/authService';

function makeMockUserRepository(overrides: Partial<any> = {}) {
  return {
    findByEmail: jest.fn(),
    createUserWithRoles: jest.fn(),
    getRolesByUserId: jest.fn(),
    findById: jest.fn(),
    getMemberStatus: jest.fn(),
    ...overrides,
  } as any;
}

function makeMockJwtService(overrides: Partial<any> = {}) {
  return {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    ...overrides,
  } as any;
}

function makeMockPasswordService(overrides: Partial<any> = {}) {
  return {
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
    ...overrides,
  } as any;
}

function makeMockNotificationService(overrides: Partial<any> = {}) {
  return {
    createUserSignupNotification: jest.fn(),
    ...overrides,
  } as any;
}

describe('AuthService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUserRepository = makeMockUserRepository({
        findByEmail: jest.fn().mockResolvedValue(null),
        createUserWithRoles: jest.fn().mockResolvedValue({
          userId: 1,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        }),
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
      });
      const mockJwtService = makeMockJwtService({
        generateToken: jest.fn().mockReturnValue('jwt-token'),
        generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      });
      const mockPasswordService = makeMockPasswordService({
        hashPassword: jest.fn().mockResolvedValue('hashedPassword'),
      });
      const mockNotificationService = makeMockNotificationService({
        createUserSignupNotification: jest.fn().mockResolvedValue(undefined),
      });

      const service = new AuthService(
        mockUserRepository,
        mockJwtService,
        mockPasswordService,
        mockNotificationService,
      );

      const result = await service.register({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123',
        roles: ['member'],
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.createUserWithRoles).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@example.com',
          passwordHash: 'hashedPassword',
        }),
        ['member'],
      );
      expect(mockNotificationService.createUserSignupNotification).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'jwt-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw error if required fields are missing', async () => {
      const service = new AuthService();

      await expect(
        service.register({
          firstName: '',
          lastName: 'Doe',
          email: 'jane@example.com',
          password: 'password123',
        } as any)
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error if email already exists', async () => {
      const mockUserRepository = makeMockUserRepository({
        findByEmail: jest.fn().mockResolvedValue({
          userId: 1,
          email: 'jane@example.com',
        }),
      });

      const service = new AuthService(mockUserRepository);

      await expect(
        service.register({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUserRepository = makeMockUserRepository({
        findByEmail: jest.fn().mockResolvedValue({
          userId: 42,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          passwordHash: 'hash',
        }),
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
      });

      const mockJwtService = makeMockJwtService({
        generateToken: jest.fn().mockReturnValue('jwt-token'),
        generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      });

      const mockPasswordService = makeMockPasswordService({
        verifyPassword: jest.fn().mockResolvedValue(true),
      });

      const service = new AuthService(
        mockUserRepository,
        mockJwtService,
        mockPasswordService,
      );

      const result = await service.login({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith('password123', 'hash');
      expect(mockUserRepository.getRolesByUserId).toHaveBeenCalledWith(42);
      expect(mockJwtService.generateToken).toHaveBeenCalledWith({
        userId: 42,
        roles: ['member'],
      });
      expect(mockJwtService.generateRefreshToken).toHaveBeenCalledWith({
        userId: 42,
      });

      expect(result).toEqual({
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          userId: 42,
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['member'],
        }),
      });
    });

    it('should throw error if credentials are missing', async () => {
      const service = new AuthService();

      await expect(
        service.login({ email: '', password: 'test' })
      ).rejects.toThrow('Missing credentials');

      await expect(
        service.login({ email: 'test@example.com', password: '' })
      ).rejects.toThrow('Missing credentials');
    });

    it('should throw error if user not found', async () => {
      const mockUserRepository = makeMockUserRepository({
        findByEmail: jest.fn().mockResolvedValue(null),
      });

      const service = new AuthService(
        mockUserRepository,
        makeMockJwtService(),
        makeMockPasswordService(),
      );

      await expect(
        service.login({ email: 'nope@example.com', password: 'test' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if user has no password hash', async () => {
      const mockUserRepository = makeMockUserRepository({
        findByEmail: jest.fn().mockResolvedValue({
          userId: 99,
          firstName: 'Bad',
          lastName: 'Login',
          email: 'bad@example.com',
          passwordHash: null,
        }),
      });

      const service = new AuthService(
        mockUserRepository,
        makeMockJwtService(),
        makeMockPasswordService(),
      );

      await expect(
        service.login({ email: 'bad@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if password is invalid', async () => {
      const mockUserRepository = makeMockUserRepository({
        findByEmail: jest.fn().mockResolvedValue({
          userId: 99,
          firstName: 'Bad',
          lastName: 'Login',
          email: 'bad@example.com',
          passwordHash: 'hash',
        }),
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
      });

      const mockPasswordService = makeMockPasswordService({
        verifyPassword: jest.fn().mockResolvedValue(false),
      });

      const service = new AuthService(
        mockUserRepository,
        makeMockJwtService(),
        mockPasswordService,
      );

      await expect(
        service.login({ email: 'bad@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      const mockUserRepository = makeMockUserRepository({
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
      });

      const mockJwtService = makeMockJwtService({
        verifyRefreshToken: jest.fn().mockReturnValue({ userId: 1 }),
        generateToken: jest.fn().mockReturnValue('new-jwt-token'),
        generateRefreshToken: jest.fn().mockReturnValue('new-refresh-token'),
      });

      const service = new AuthService(
        mockUserRepository,
        mockJwtService,
        makeMockPasswordService(),
      );

      const result = await service.refresh('old-token', 'refresh-token');

      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockUserRepository.getRolesByUserId).toHaveBeenCalledWith(1);
      expect(mockJwtService.generateToken).toHaveBeenCalledWith({
        userId: 1,
        roles: ['member'],
      });
      expect(mockJwtService.generateRefreshToken).toHaveBeenCalledWith({
        userId: 1,
      });

      expect(result).toEqual({
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('getUserStatus', () => {
    it('should return user status with member role', async () => {
      const mockUserRepository = makeMockUserRepository({
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
        getMemberStatus: jest.fn().mockResolvedValue('approved'),
      });

      const service = new AuthService(mockUserRepository);

      const result = await service.getUserStatus(1);

      expect(mockUserRepository.getRolesByUserId).toHaveBeenCalledWith(1);
      expect(mockUserRepository.getMemberStatus).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        userId: 1,
        roles: ['member'],
        membershipStatus: 'approved',
      });
    });

    it('should return visitor status for non-member', async () => {
      const mockUserRepository = makeMockUserRepository({
        getRolesByUserId: jest.fn().mockResolvedValue(['admin']),
      });

      const service = new AuthService(mockUserRepository);

      const result = await service.getUserStatus(1);

      expect(mockUserRepository.getRolesByUserId).toHaveBeenCalledWith(1);
      expect(mockUserRepository.getMemberStatus).not.toHaveBeenCalled();
      expect(result).toEqual({
        userId: 1,
        roles: ['admin'],
        membershipStatus: 'visitor',
      });
    });

    it('should return pending status when member status is null', async () => {
      const mockUserRepository = makeMockUserRepository({
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
        getMemberStatus: jest.fn().mockResolvedValue(null),
      });

      const service = new AuthService(mockUserRepository);

      const result = await service.getUserStatus(1);

      expect(result).toEqual({
        userId: 1,
        roles: ['member'],
        membershipStatus: 'pending',
      });
    });
  });

  describe('getMe', () => {
    it('should return user profile with roles', async () => {
      const mockUserRepository = makeMockUserRepository({
        findById: jest.fn().mockResolvedValue({
          userId: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          passwordHash: 'hash',
        }),
        getRolesByUserId: jest.fn().mockResolvedValue(['member']),
      });

      const service = new AuthService(mockUserRepository);

      const result = await service.getMe(1);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockUserRepository.getRolesByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        roles: ['member'],
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error if user not found', async () => {
      const mockUserRepository = makeMockUserRepository({
        findById: jest.fn().mockResolvedValue(null),
      });

      const service = new AuthService(mockUserRepository);

      await expect(service.getMe(999)).rejects.toThrow('User not found');
    });
  });
});
