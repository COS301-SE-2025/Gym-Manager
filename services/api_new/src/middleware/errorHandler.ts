import { Request, Response } from 'express';

export function errorHandler(err: any, _req: Request, res: Response) {
  const status = err.statusCode ?? 500;

  const payload =
    process.env.NODE_ENV === 'production'
      ? { error: err.message ?? 'Internal error' }
      : { error: err.message, stack: err.stack };

  console.error('[ERROR]', err);
  res.status(status).json(payload);
}
