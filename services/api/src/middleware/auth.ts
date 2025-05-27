// === services/api/src/middleware/auth.ts ===
import { Request, Response, NextFunction } from 'express';
// === services/api/src/middleware/auth.ts ===
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';
const JWT_EXPIRES_IN = '1h'; // adjust as needed

// Hash a plain password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password against hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate a JWT token
export function generateJwt(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Example token check (mocked)
  if (token !== 'valid-token') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
};


