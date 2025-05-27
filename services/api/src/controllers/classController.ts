// === services/api/src/controllers/classController.ts ===
import { Request, Response, NextFunction } from 'express';

export const createClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Your logic here
    res.status(201).json({ message: 'Class created successfully' });
  } catch (err) {
    next(err);
  }
};


