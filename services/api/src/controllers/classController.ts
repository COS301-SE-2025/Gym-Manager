// === services/api/src/controllers/classController.ts ===
import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export const getClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM classes');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};



