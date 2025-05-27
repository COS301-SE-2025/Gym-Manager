// === services/api/src/controllers/scheduleController.ts ===
import { Request, Response } from 'express';

export const createSchedule = async (req: Request, res: Response) => {
  // TODO: insert class schedule into DB
  const { name, time } = req.body;
  res.json({ success: true, name, time });
};

export const assignCoach = async (req: Request, res: Response) => {
  const scheduleId = req.params.id;
  const { coachId } = req.body;
  // TODO: update schedule to assign coach
  res.json({ success: true, scheduleId, coachId });
};