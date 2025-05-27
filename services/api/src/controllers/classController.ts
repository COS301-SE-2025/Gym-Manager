// === services/api/src/controllers/classController.ts ===
import { Request, Response } from 'express';

export const viewClasses = async (req: Request, res: Response) => {
  // TODO: fetch from DB
  res.json([{ id: 1, name: 'HIIT Monday', time: '08:00' }]);
};

export const bookClass = async (req: Request, res: Response) => {
  const classId = req.params.id;
  const userId = (req as any).user.id;
  // TODO: insert booking into DB
  res.json({ success: true, classId, userId });
};
