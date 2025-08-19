// services/api/src/middleware/roles.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { userroles } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthedReq extends Request {
  user?: { userId: number; roles?: string[] };
}

export const roles = (allowed: string[]) => {
  return async (req: AuthedReq, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    let userRoles = req.user.roles;
    if (!userRoles || userRoles.length === 0) {
      const rows = await db
        .select({ role: userroles.userRole })
        .from(userroles)
        .where(eq(userroles.userId, req.user.userId));
      userRoles = rows.map(r => String(r.role));
      req.user.roles = userRoles;
    }

    if (!allowed.some(r => userRoles?.includes(r))) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    next();
  };
};
