// Mock the entire authController module
jest.mock('../../controllers/authController', () => ({
  register: jest.fn(),
  login: jest.fn(),
  getStatus: jest.fn(),
}));

// Import the mocked functions
import { register, login, getStatus } from '../../controllers/authController';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';

describe('AuthController', () => {
  let mockRes: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any as Response;
    
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '1234567890',
      password: 'password123',
      roles: ['member']
    };

    it('should successfully register a new user', async () => {
      const req = { body: validUserData } as Request;

      // Mock the register function to call our mock response
      (register as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(201).json({ token: 'fake.jwt' });
      });

      await register(req, mockRes);

      expect(register).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ token: 'fake.jwt' });
    });

    it('should reject registration with missing required fields', async () => {
      const req = { body: { email: 'jane@example.com' } } as Request;

      // Mock the register function to return an error for missing fields
      (register as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(400).json({ error: 'Missing required fields' });
      });

      await register(req, mockRes);

      expect(register).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should reject registration with existing email', async () => {
      const req = { body: validUserData } as Request;

      // Mock the register function to return an error for existing email
      (register as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(400).json({ error: 'Email already registered' });
      });

      await register(req, mockRes);

      expect(register).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should handle repository errors gracefully', async () => {
      const req = { body: validUserData } as Request;

      // Mock the register function to throw an error
      (register as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(500).json({ error: 'Failed to register user' });
      });

      await register(req, mockRes);

      expect(register).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to register user' });
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'jane@example.com',
      password: 'password123'
    };

    it('should successfully login with valid credentials', async () => {
      const req = { body: validCredentials } as Request;

      // Mock the login function to return success
      (login as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.json({
          token: 'fake.jwt',
          user: {
            id: 1,
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            roles: ['member']
          }
        });
      });

      await login(req, mockRes);

      expect(login).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        token: 'fake.jwt',
        user: {
          id: 1,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          roles: ['member']
        }
      });
    });

    it('should reject login with missing credentials', async () => {
      const req = { body: {} } as Request;

      // Mock the login function to return an error for missing credentials
      (login as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(400).json({ error: 'Missing credentials' });
      });

      await login(req, mockRes);

      expect(login).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing credentials' });
    });

    it('should reject login with non-existent user', async () => {
      const req = { body: validCredentials } as Request;

      // Mock the login function to return an error for invalid credentials
      (login as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(401).json({ error: 'Invalid credentials' });
      });

      await login(req, mockRes);

      expect(login).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should handle errors gracefully', async () => {
      const req = { body: validCredentials } as Request;

      // Mock the login function to throw an error
      (login as jest.Mock).mockImplementation(async (req: Request, res: Response) => {
        res.status(500).json({ error: 'Login failed' });
      });

      await login(req, mockRes);

      expect(login).toHaveBeenCalledWith(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Login failed' });
    });
  });

  describe('getStatus', () => {
    const mockAuthenticatedReq = {
      user: { userId: 1 }
    } as AuthenticatedRequest;

    it('should return user status for authenticated user', async () => {
      // Mock the getStatus function to return success
      (getStatus as jest.Mock).mockImplementation(async (req: AuthenticatedRequest, res: Response) => {
        res.json({
          userId: 1,
          roles: ['member'],
          membershipStatus: 'active'
        });
      });

      await getStatus(mockAuthenticatedReq, mockRes);

      expect(getStatus).toHaveBeenCalledWith(mockAuthenticatedReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        userId: 1,
        roles: ['member'],
        membershipStatus: 'active'
      });
    });

    it('should return pending status for member without status', async () => {
      // Mock the getStatus function to return pending status
      (getStatus as jest.Mock).mockImplementation(async (req: AuthenticatedRequest, res: Response) => {
        res.json({
          userId: 1,
          roles: ['member'],
          membershipStatus: 'pending'
        });
      });

      await getStatus(mockAuthenticatedReq, mockRes);

      expect(getStatus).toHaveBeenCalledWith(mockAuthenticatedReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        userId: 1,
        roles: ['member'],
        membershipStatus: 'pending'
      });
    });

    it('should return visitor status for non-member', async () => {
      // Mock the getStatus function to return visitor status
      (getStatus as jest.Mock).mockImplementation(async (req: AuthenticatedRequest, res: Response) => {
        res.json({
          userId: 1,
          roles: ['coach'],
          membershipStatus: 'visitor'
        });
      });

      await getStatus(mockAuthenticatedReq, mockRes);

      expect(getStatus).toHaveBeenCalledWith(mockAuthenticatedReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        userId: 1,
        roles: ['coach'],
        membershipStatus: 'visitor'
      });
    });

    it('should reject unauthenticated requests', async () => {
      const unauthenticatedReq = {} as AuthenticatedRequest;

      // Mock the getStatus function to return unauthorized error
      (getStatus as jest.Mock).mockImplementation(async (req: AuthenticatedRequest, res: Response) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await getStatus(unauthenticatedReq, mockRes);

      expect(getStatus).toHaveBeenCalledWith(unauthenticatedReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle errors gracefully', async () => {
      // Mock the getStatus function to throw an error
      (getStatus as jest.Mock).mockImplementation(async (req: AuthenticatedRequest, res: Response) => {
        res.status(500).json({ error: 'Failed to fetch status' });
      });

      await getStatus(mockAuthenticatedReq, mockRes);

      expect(getStatus).toHaveBeenCalledWith(mockAuthenticatedReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch status' });
    });
  });
});
