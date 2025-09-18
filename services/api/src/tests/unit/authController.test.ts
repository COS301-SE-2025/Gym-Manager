import { Request, Response } from 'express';
import { AuthController } from '../../controllers/auth/authController';
import { AuthService } from '../../services/auth/authService';
import { UserRegistrationData, UserLoginData } from '../../domain/entities/user.entity';

// Mock the AuthService
jest.mock('../../services/auth/authService');

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock AuthService
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      getUserStatus: jest.fn(),
      getMe: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new AuthController(mockAuthService);

    // Create mock request and response objects
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const userData: UserRegistrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'password123',
        roles: ['member'],
      };

      const expectedResult = {
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          roles: ['member'],
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      mockRequest.body = userData;
      mockAuthService.register.mockResolvedValue(expectedResult);

      await controller.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).toHaveBeenCalledWith(userData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle missing required fields error', async () => {
      const userData = {
        firstName: 'John',
        // Missing required fields
      };

      mockRequest.body = userData;
      mockAuthService.register.mockRejectedValue(new Error('Missing required fields'));

      await controller.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should handle email already registered error', async () => {
      const userData: UserRegistrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        phone: '1234567890',
        password: 'password123',
        roles: ['member'],
      };

      mockRequest.body = userData;
      mockAuthService.register.mockRejectedValue(new Error('Email already registered'));

      await controller.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should handle generic registration errors', async () => {
      const userData: UserRegistrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'password123',
        roles: ['member'],
      };

      mockRequest.body = userData;
      mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));

      await controller.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to register user' });
    });

    it('should use default roles when not provided', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'password123',
        // roles not provided
      };

      const expectedUserData: UserRegistrationData = {
        ...userData,
        roles: ['member'], // default value
      };

      const expectedResult = {
        user: { id: 1, ...expectedUserData },
        tokens: { accessToken: 'token', refreshToken: 'refresh' },
      };

      mockRequest.body = userData;
      mockAuthService.register.mockResolvedValue(expectedResult);

      await controller.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).toHaveBeenCalledWith(expectedUserData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const loginData: UserLoginData = {
        email: 'john@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          roles: ['member'],
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      mockRequest.body = loginData;
      mockAuthService.login.mockResolvedValue(expectedResult);

      await controller.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle invalid credentials error', async () => {
      const loginData: UserLoginData = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      mockRequest.body = loginData;
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await controller.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should handle generic login errors', async () => {
      const loginData: UserLoginData = {
        email: 'john@example.com',
        password: 'password123',
      };

      mockRequest.body = loginData;
      mockAuthService.login.mockRejectedValue(new Error('Service unavailable'));

      await controller.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to login user' });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      const expectedResult = {
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      mockRequest.body = refreshData;
      mockAuthService.refresh.mockResolvedValue(expectedResult);

      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshData.refreshToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle invalid refresh token error', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token',
      };

      mockRequest.body = refreshData;
      mockAuthService.refresh.mockRejectedValue(new Error('Invalid refresh token'));

      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });

    it('should handle generic refresh errors', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      mockRequest.body = refreshData;
      mockAuthService.refresh.mockRejectedValue(new Error('Token service error'));

      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to refresh tokens' });
    });
  });

  describe('getUserStatus', () => {
    it('should get user status successfully', async () => {
      const userId = 1;
      const expectedResult = {
        userId: 1,
        status: 'active',
        lastLogin: '2024-01-01T00:00:00Z',
        roles: ['member'],
      };

      mockRequest.params = { userId: userId.toString() };
      mockAuthService.getUserStatus.mockResolvedValue(expectedResult);

      await controller.getUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.getUserStatus).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle user not found error', async () => {
      const userId = 999;

      mockRequest.params = { userId: userId.toString() };
      mockAuthService.getUserStatus.mockRejectedValue(new Error('User not found'));

      await controller.getUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle generic getUserStatus errors', async () => {
      const userId = 1;

      mockRequest.params = { userId: userId.toString() };
      mockAuthService.getUserStatus.mockRejectedValue(new Error('Database error'));

      await controller.getUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to get user status' });
    });
  });

  describe('getMe', () => {
    it('should get current user successfully', async () => {
      const userId = 1;
      const expectedResult = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        roles: ['member'],
        createdAt: '2024-01-01T00:00:00Z',
      };

      // Mock authenticated request
      const authenticatedRequest = {
        ...mockRequest,
        user: { userId },
      };

      mockAuthService.getMe.mockResolvedValue(expectedResult);

      await controller.getMe(authenticatedRequest as any, mockResponse as Response);

      expect(mockAuthService.getMe).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle user not found error', async () => {
      const userId = 999;

      const authenticatedRequest = {
        ...mockRequest,
        user: { userId },
      };

      mockAuthService.getMe.mockRejectedValue(new Error('User not found'));

      await controller.getMe(authenticatedRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle generic getMe errors', async () => {
      const userId = 1;

      const authenticatedRequest = {
        ...mockRequest,
        user: { userId },
      };

      mockAuthService.getMe.mockRejectedValue(new Error('Service error'));

      await controller.getMe(authenticatedRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to get user profile' });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = new AuthService();
      const controller = new AuthController(customService);
      expect(controller).toBeInstanceOf(AuthController);
    });

    it('should create controller with default service when none provided', () => {
      const controller = new AuthController();
      expect(controller).toBeInstanceOf(AuthController);
    });
  });
});
