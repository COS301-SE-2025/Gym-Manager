import jwt from 'jsonwebtoken';
import { IJwtService } from '../../domain/interfaces/auth.interface';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '2h';
const REFRESH_EXPIRES_IN = '30d';

export class JwtService implements IJwtService {
  generateToken(payload: object): string {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token: string): any {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.verify(token, JWT_SECRET);
  }

  generateRefreshToken(payload: object): string {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  }

  verifyRefreshToken(token: string): any {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.verify(token, JWT_SECRET);
  }
}
