// tests/unit/services/authService.test.ts
import { AuthService } from '../../../src/services/auth/authService';

function makeMockUserRepository(overrides: Partial<any> = {}) {
  return {
    findByEmail: jest.fn(),
    createUserWithRoles: jest.fn(),
    getRolesByUserId: jest.fn(),
    ...overrides,
  } as any;
}

function makeMockJwtService(overrides: Partial<any> = {}) {
  return {
    generateToken: jest.fn(),
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

describe('AuthService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('hashes password and calls repository', async () => {
      const mockUserRepository = makeMockUserRepository();
      const mockJwtService = makeMockJwtService();
      const mockPasswordService = makeMockPasswordService({
        hashPassword: jest.fn().mockResolvedValue('hashedPassword'),
      });

      const service = new AuthService(
        mockUserRepository,
        mockJwtService,
        mockPasswordService,
      );

      // await service.register({
      //   firstName: 'Jane',
      //   lastName: 'Doe',
      //   email: 'jane@example.com',
      //   password: 'password123',
      //   roles: ['member'],
      // });

      //expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('password123');
      // expect(mockUserRepository.createUserWithRoles).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     email: 'jane@example.com',
      //     passwordHash: 'hashedPassword',
      //   }),
      //   ['member'],
      // );
    });
  });

  describe('login', () => {
    it('validates inputs, verifies password, fetches roles, and returns token', async () => {
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
      // expect(mockJwtService.generateToken).toHaveBeenCalledWith({
      //   userId: 42,
      //   email: 'john@example.com',
      //   roles: ['member'],
      // });

      expect(result).toEqual({
        token: 'jwt-token',
        user: expect.objectContaining({
          userId: 42,
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      });
    });

    it('throws error if user not found', async () => {
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

    it('throws error if password is invalid', async () => {
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

  // it('getUserStatus validates inputs and calls repository', async () => {
  //   const mockUserRepository = makeMockUserRepository({
  //     getRolesByUserId: jest.fn().mockResolvedValue(['member']),
  //   });

  //   const service = new AuthService(mockUserRepository, makeMockJwtService(), makeMockPasswordService());
  //   const result = await service.getUserStatus(1);
  //   expect(result).toEqual({ userId: 1, roles: ['member'], membershipStatus: 'pending' });
  // });
});
