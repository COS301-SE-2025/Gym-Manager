import { Request, Response, NextFunction } from 'express';

export const requestTimeout =
  (ms: number = 10_000) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next();

    const timer = setTimeout(() => {
      if (res.headersSent) return;
      res.status(503).json({ error: 'TIMEOUT' });

      console.warn(`[TIMEOUT] ${req.method} ${req.originalUrl}`);
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    next();
  };