// === services/api/src/controllers/scheduleController.ts ===
import { Request, Response, NextFunction } from 'express';

export const createSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Your logic here
    res.status(201).json({ message: 'Schedule created successfully' });
  } catch (err) {
    next(err);
  }
};

