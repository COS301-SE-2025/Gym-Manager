// Flexible roles middleware: supports req.user.role or req.user.roles (string[])
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function roles(allowed: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // accept either a single role or an array of roles
    const userRoles: string[] = Array.isArray(req.user.roles)
      ? req.user.roles as string[]
      : req.user.role
      ? [String(req.user.role)]
      : [];

    const ok = allowed.some(r => userRoles.includes(r));
    if (!ok) return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  };
}

// Back-compat: keep your old API too
export const requireRole = (role: string) => roles([role]);

export default roles;
