import { db } from '../db/client';
import { classes, coaches, workouts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

import { AuthenticatedRequest } from '../middleware/auth';

export const createSchedule = async (req: Request, res: Response) => {
  // Could represent a schedule entity or just bulk create classes - adjust as needed.
  // Assuming schedule means creating multiple classes at once
  const { schedule } = req.body; // [{ capacity, scheduledDate, scheduledTime, durationMinutes, coachId, workoutId, createdBy }, ...]
  // Validation omitted for brevity
  const createdClasses = [];
  for (const c of schedule) {
    const [created] = await db.insert(classes).values(c).returning();
    createdClasses.push(created);
  }
  res.json(createdClasses);
};

export const createClass = async (req : AuthenticatedRequest, res : Response) => {
  const { capacity, scheduledDate, scheduledTime, durationMinutes, coachId, workoutId, createdBy } = req.body;
  const [created] = await db.insert(classes).values({
    capacity,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    coachId,
    workoutId,
    createdBy,
  }).returning();
  res.json(created);
};

export const assignCoach = async (req: AuthenticatedRequest, res: Response) => {
  const { classId, coachId } = req.body;
  if (!classId || !coachId) {
    return res.status(400).json({ error: 'classId and coachId are required' });
  }

  console.log('Assigning coach:', coachId, 'to class:', classId);

  const [coach] = await db
    .select()
    .from(coaches)
    .where(eq(coaches.userId, coachId));

  if (!coach) {
    console.error('Coach not found for ID:', coachId);
    return res.status(400).json({ error: 'Invalid coach' });
  }

  await db
    .update(classes)
    .set({ coachId })
    .where(eq(classes.classId, classId));

  res.json({ success: true });
};

