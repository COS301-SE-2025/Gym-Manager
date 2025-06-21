import { db } from '../db/client';
import { classes, coaches, workouts, userroles, members, admins, managers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
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

//Assign users to roles
// POST /roles/assign
export const assignUserToRole = async (req: Request, res: Response) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'Missing userId or role' });
  }

  const roleExists = await db
    .select()
    .from(userroles)
    .where(and(eq(userroles.userId, userId), eq(userroles.userRole, role)));

  if (roleExists.length > 0) {
    return res.status(409).json({ error: 'User already has this role' });
  }

  await db.insert(userroles).values({ userId, userRole: role });

  // Optionally insert into specialized table
  switch (role) {
    case 'coach':
      await db.insert(coaches).values({ userId });
      break;
    case 'member':
      await db.insert(members).values({ userId });
      break;
    case 'admin':
      await db.insert(admins).values({ userId });
      break;
    case 'manager':
      await db.insert(managers).values({ userId });
      break;
  }

  res.json({ success: true });
};


