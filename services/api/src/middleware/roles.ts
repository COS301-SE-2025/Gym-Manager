// === apps/api/src/middleware/roles.ts ===
import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user?.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};