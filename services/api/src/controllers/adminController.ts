import { db } from '../db/client';
import { classes, coaches, workouts, userroles, members, admins, managers, users } from '../db/schema';
import { eq, and, asc, between } from 'drizzle-orm';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { format } from 'date-fns';
import { parseISO as dateFnsParseISO } from 'date-fns';

const dayToOffset: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export const createWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { startDate, createdBy, weeklySchedule } = req.body;
    const baseDate = dateFnsParseISO(startDate);
    const insertedClasses = [];

    for (const dayBlock of weeklySchedule) {
      const offset = dayToOffset[dayBlock.day];
      if (offset === undefined) continue;

      const scheduledDate = addDays(baseDate, offset);

      for (const cls of dayBlock.classes) {
        const newClass = {
          scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
          scheduledTime: cls.time,
          durationMinutes: cls.durationMinutes,
          capacity: cls.capacity,
          coachId: cls.coachId,
          workoutId: cls.workoutId,
          createdBy
        };
        const [inserted] = await db.insert(classes).values(newClass).returning();
        insertedClasses.push(inserted);
      }
    }

    res.status(201).json({ success: true, insertedClasses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create weekly schedule' });
  }
};

export const getWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const today = new Date();

    // Define Monday–Sunday range
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const results = await db
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        capacity: classes.capacity,
        workoutName: workouts.workoutName,
        coachName: users.firstName,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(coaches, eq(classes.coachId, coaches.userId))
      .leftJoin(users, eq(coaches.userId, users.userId))
      .where(between(classes.scheduledDate, weekStart, weekEnd))
      .orderBy(asc(classes.scheduledDate), asc(classes.scheduledTime));

    // Group by date
    const grouped = results.reduce((acc, cls) => {
      const day = cls.scheduledDate;
      if (!acc[day]) acc[day] = [];
      acc[day].push(cls);
      return acc;
    }, {} as Record<string, typeof results>);

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weekly schedule' });
  }
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

// GET /users/members
export const getAllMembers = async (req: Request, res: Response) => {
  const result = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      status: members.status,
      credits: members.creditsBalance,
    })
    .from(users)
    .innerJoin(members, eq(users.userId, members.userId));

  res.json(result);
};

// GET /roles/getUsersByRole/
export const getUsersByRole = async (req: Request, res: Response) => {
  const role = req.params.role;

  const allowedRoles = ['coach', 'member', 'admin', 'manager'] as const;
  type RoleType = typeof allowedRoles[number];

  if (!allowedRoles.includes(role as RoleType)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const result = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .innerJoin(userroles, eq(users.userId, userroles.userId))
    .where(eq(userroles.userRole, role as RoleType));

  res.json(result);
};

// GET /users/allUsers
export const getAllUsers = async (req: Request, res: Response) => {
  const result = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
    })
    .from(users);

  res.json(result);
}
;

// POST /users/removeCoachRole
export const removeCoachRole = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  await db
    .delete(coaches)
    .where(eq(coaches.userId, userId));

  await db
    .delete(userroles)
    .where(and(eq(userroles.userId, userId), eq(userroles.userRole, 'coach')));

  res.json({ success: true });
};


// POST /users/removeMemberRole
export const removeMemberRole = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  await db
    .delete(members)
    .where(eq(members.userId, userId));

  await db
    .delete(userroles)
    .where(and(eq(userroles.userId, userId), eq(userroles.userRole, 'member')));

  res.json({ success: true });
};

// POST /users/removeAdminRole
export const removeAdminRole = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  await db
    .delete(admins)
    .where(eq(admins.userId, userId));

  await db
    .delete(userroles)
    .where(and(eq(userroles.userId, userId), eq(userroles.userRole, 'admin')));

  res.json({ success: true });
};


// POST /users/removeManagerRole
export const removeManagerRole = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  await db
    .delete(managers)
    .where(eq(managers.userId, userId));

  await db
    .delete(userroles)
    .where(and(eq(userroles.userId, userId), eq(userroles.userRole, 'manager')));

  res.json({ success: true });
};

function addDays(baseDate: Date, offset: number) {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + offset);
  return result;
}
function startOfWeek(date: Date, options: { weekStartsOn: number }): Date {
  const day = date.getDay();
  const diff = (day < options.weekStartsOn ? 7 : 0) + day - options.weekStartsOn;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}
function endOfWeek(date: Date, options: { weekStartsOn: number }): Date {
  const start = startOfWeek(date, options);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

