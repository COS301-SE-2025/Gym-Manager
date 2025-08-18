import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { AuthService } from '../../services/auth/authService';
import { UserRegistrationData, UserLoginData } from '../../domain/entities/user.entity';

/**
 * AuthController - Controller Layer
 * Handles HTTP requests/responses and delegates business logic to service layer
 */
export class AuthController {
  private authService: AuthService;

  constructor(authService?: AuthService) {
    this.authService = authService || new AuthService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone, password, roles = ['member'] } = req.body;

      const userData: UserRegistrationData = {
        firstName,
        lastName,
        email,
        phone,
        password,
        roles,
      };

      const result = await this.authService.register(userData);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Register error:', error);
      
      if (error.message === 'Missing required fields') {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (error.message === 'Email already registered') {
        return res.status(400).json({ error: 'Email already registered' });
      }

      return res.status(500).json({ error: 'Failed to register user' });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const loginData: UserLoginData = {
        email,
        password,
      };

      const result = await this.authService.login(loginData);
      return res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'Missing credentials') {
        return res.status(400).json({ error: 'Missing credentials' });
      }
      
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(500).json({ error: 'Login failed' });
    }
  };

  getStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId as number;
      const result = await this.authService.getUserStatus(userId);
      
      return res.json(result);
    } catch (error: any) {
      console.error('Status fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch status' });
    }
  };
}
