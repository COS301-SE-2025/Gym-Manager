// === services/api/src/controllers/classController.ts ===
// src/controllers/classController.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { classes } from '../db/schema';

export const getClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.select().from(classes);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: Request, res: Response, next: NextFunction) => {
  const { name, description } = req.body;
  try {
    const result = await db.insert(classes).values({ name, description }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    next(error);
  }
};




