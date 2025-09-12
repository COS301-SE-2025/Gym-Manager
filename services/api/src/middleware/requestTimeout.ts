import { Request, Response, NextFunction } from 'express';

export const requestTimeout = (timeoutMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalSend = res.send;
    res.send = function(data) {
      clearTimeout(timeout);
      return originalSend.call(this, data);
    };

    next();
  };
};
