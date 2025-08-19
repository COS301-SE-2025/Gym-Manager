import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../auth/jwtService';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export class AuthMiddleware {
  private jwtService: JwtService;

  constructor() {
    this.jwtService = new JwtService();
  }

  isAuthenticated = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void | Response => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verifyToken(token);
      req.user = decoded;
      return next();
    } catch (err) {
      console.error('JWT verification failed:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
  };
}
