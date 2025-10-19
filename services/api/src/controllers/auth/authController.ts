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
      const { email, password, mfaToken, mfaBackupCode } = req.body;

      const loginData: UserLoginData & { mfaToken?: string; mfaBackupCode?: string } = {
        email,
        password,
        mfaToken,
        mfaBackupCode,
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

      if (error.message === 'MFA token required') {
        return res.status(401).json({ error: 'MFA token required' });
      }

      if (error.message === 'Invalid MFA token or backup code') {
        return res.status(401).json({ error: 'Invalid MFA token or backup code' });
      }

      return res.status(500).json({ error: 'Login failed' });
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Missing refresh token' });
      }

      const result = await this.authService.refresh(accessToken, refreshToken);
      return res.json(result);
    } catch (error: any) {
      console.error('Refresh error:', error);
      return res.status(401).json({ error: 'Invalid refresh token' });
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

  getMe = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userId = req.user.userId as number;
      const me = await this.authService.getMe(userId);
      return res.json(me);
    } catch (error: any) {
      console.error('Get me error:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  };

  // Password change endpoint
  changePassword = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId as number;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      await this.authService.changePassword(userId, currentPassword, newPassword);
      return res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      console.error('Change password error:', error);

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      return res.status(500).json({ error: 'Failed to change password' });
    }
  };

  // MFA setup endpoints
  generateMfaSecret = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId as number;
      const result = await this.authService.generateMfaSecret(userId);
      return res.json(result);
    } catch (error: any) {
      console.error('Generate MFA secret error:', error);

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(500).json({ error: 'Failed to generate MFA secret' });
    }
  };

  enableMfa = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { token } = req.body;
      const userId = req.user.userId as number;

      if (!token) {
        return res.status(400).json({ error: 'MFA token is required' });
      }

      const result = await this.authService.enableMfa(userId, token);
      return res.json(result);
    } catch (error: any) {
      console.error('Enable MFA error:', error);

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      if (error.message === 'Invalid MFA token') {
        return res.status(400).json({ error: 'Invalid MFA token' });
      }

      return res.status(500).json({ error: 'Failed to enable MFA' });
    }
  };

  disableMfa = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { token } = req.body;
      const userId = req.user.userId as number;

      if (!token) {
        return res.status(400).json({ error: 'MFA token is required' });
      }

      await this.authService.disableMfa(userId, token);
      return res.json({ message: 'MFA disabled successfully' });
    } catch (error: any) {
      console.error('Disable MFA error:', error);

      if (error.message === 'MFA is not enabled') {
        return res.status(400).json({ error: 'MFA is not enabled' });
      }

      if (error.message === 'Invalid MFA token') {
        return res.status(400).json({ error: 'Invalid MFA token' });
      }

      return res.status(500).json({ error: 'Failed to disable MFA' });
    }
  };

  // Get MFA status endpoint
  getMfaStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.userId as number;
      const mfaSettings = await this.authService.getMfaStatus(userId);
      return res.json(mfaSettings);
    } catch (error: any) {
      console.error('Get MFA status error:', error);

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(500).json({ error: 'Failed to get MFA status' });
    }
  };
}
