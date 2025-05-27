// === services/api/src/middleware/auth.ts ===
import { Request, Response, NextFunction } from 'express';

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


