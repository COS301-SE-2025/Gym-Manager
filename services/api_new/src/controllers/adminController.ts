<<<<<<< HEAD
// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import AdminRepository, { WeeklyScheduleInput } from '../repositories/admin.repository';

const adminRepo = new AdminRepository();

/* ============== SCHEDULING / CLASSES ============== */

export const createWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { startDate, createdBy, weeklySchedule } = req.body as {
      startDate: string;
      createdBy: number;
      weeklySchedule: WeeklyScheduleInput;
    };

    const inserted = await adminRepo.createWeeklySchedule(startDate, createdBy, weeklySchedule);
    return res.status(201).json({ success: true, insertedClasses: inserted });
  } catch (err) {
    console.error('createWeeklySchedule error:', err);
    return res.status(500).json({ error: 'Failed to create weekly schedule' });
  }
};

export const getWeeklySchedule = async (_req: Request, res: Response) => {
  try {
    const grouped = await adminRepo.getWeeklySchedule();
    return res.json(grouped);
  } catch (err) {
    console.error('getWeeklySchedule error:', err);
    return res.status(500).json({ error: 'Failed to fetch weekly schedule' });
=======
import { db } from '../db/client';
import {
  classes,
  coaches,
  workouts,
  userroles,
  members,
  admins,
  managers,
  users,
} from '../db/schema';
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
    const insertedClasses: typeof classes.$inferSelect[] = [];

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
          createdBy,
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
    const grouped = results.reduce(
      (acc, cls) => {
        const day = cls.scheduledDate;
        if (!acc[day]) acc[day] = [];
        acc[day].push(cls);
        return acc;
      },
      {} as Record<string, typeof results>,
    );

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weekly schedule' });
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3
  }
};

export const createClass = async (req: AuthenticatedRequest, res: Response) => {
<<<<<<< HEAD
  try {
    const payload = req.body as {
      capacity: number;
      scheduledDate: string;
      scheduledTime: string;
      durationMinutes: number;
      coachId?: number | null;
      workoutId?: number | null;
      createdBy: number;
    };
    const created = await adminRepo.createClass(payload);
    return res.json(created);
  } catch (err) {
    console.error('createClass error:', err);
    return res.status(500).json({ error: 'Failed to create class' });
  }
};

export const assignCoach = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId, coachId } = req.body as { classId: number; coachId: number };
    if (!classId || !coachId) {
      return res.status(400).json({ error: 'classId and coachId are required' });
    }

    const result = await adminRepo.assignCoachToClass(classId, coachId);
    if (!result.ok && result.reason === 'invalid_coach') {
      return res.status(400).json({ error: 'Invalid coach' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('assignCoach error:', err);
    return res.status(500).json({ error: 'Failed to assign coach' });
  }
};

/* ============== ROLES & USERS ============== */

export const assignUserToRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body as { userId: number; role: 'coach'|'member'|'admin'|'manager' };
    if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' });

    const result = await adminRepo.assignUserToRole(userId, role);
    if (!result.ok && result.reason === 'already_has_role') {
      return res.status(409).json({ error: 'User already has this role' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('assignUserToRole error:', err);
    return res.status(500).json({ error: 'Failed to assign role' });
  }
};

export const getAllMembers = async (_req: Request, res: Response) => {
  try {
    const members = await adminRepo.getAllMembers();
    return res.json(members);
  } catch (err) {
    console.error('getAllMembers error:', err);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
};

export const getUsersByRole = async (req: Request, res: Response) => {
  try {
    const role = req.params.role as 'coach'|'member'|'admin'|'manager';
    const allowed = ['coach', 'member', 'admin', 'manager'] as const;
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const rows = await adminRepo.getUsersByRole(role);
    return res.json(rows);
  } catch (err) {
    console.error('getUsersByRole error:', err);
    return res.status(500).json({ error: 'Failed to fetch users by role' });
  }
};

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const rows = await adminRepo.getAllUsers();
    return res.json(rows);
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const removeCoachRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: number };
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    await adminRepo.removeRole(userId, 'coach');
    return res.json({ success: true });
  } catch (err) {
    console.error('removeCoachRole error:', err);
    return res.status(500).json({ error: 'Failed to remove coach role' });
  }
};

export const removeMemberRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: number };
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    await adminRepo.removeRole(userId, 'member');
    return res.json({ success: true });
  } catch (err) {
    console.error('removeMemberRole error:', err);
    return res.status(500).json({ error: 'Failed to remove member role' });
  }
};

export const removeAdminRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: number };
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    await adminRepo.removeRole(userId, 'admin');
    return res.json({ success: true });
  } catch (err) {
    console.error('removeAdminRole error:', err);
    return res.status(500).json({ error: 'Failed to remove admin role' });
  }
};

export const removeManagerRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: number };
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    await adminRepo.removeRole(userId, 'manager');
    return res.json({ success: true });
  } catch (err) {
    console.error('removeManagerRole error:', err);
    return res.status(500).json({ error: 'Failed to remove manager role' });
  }
};

export const getRolesByUserId = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const roles = await adminRepo.getRolesByUserId(userId);
    if (roles.length === 0) return res.status(404).json({ error: 'No roles found for this user' });

    return res.json(roles);
  } catch (err) {
    console.error('getRolesByUserId error:', err);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const user = await adminRepo.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json(user);
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUserById = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    const updates = req.body;

    const result = await adminRepo.updateUserById(userId, updates);
    if (!result.ok && result.reason === 'role_not_found') {
      return res.status(404).json({ error: 'User role not found' });
    }

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('updateUserById error:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};
=======
  const { capacity, scheduledDate, scheduledTime, durationMinutes, coachId, workoutId, createdBy } =
    req.body;
  const [created] = await db
    .insert(classes)
    .values({
      capacity,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      coachId,
      workoutId,
      createdBy,
    })
    .returning();
  res.json(created);
};

export const assignCoach = async (req: AuthenticatedRequest, res: Response) => {
  const { classId, coachId } = req.body;
  if (!classId || !coachId) {
    return res.status(400).json({ error: 'classId and coachId are required' });
  }

  console.log('Assigning coach:', coachId, 'to class:', classId);

  const [coach] = await db.select().from(coaches).where(eq(coaches.userId, coachId));

  if (!coach) {
    console.error('Coach not found for ID:', coachId);
    return res.status(400).json({ error: 'Invalid coach' });
  }

  await db.update(classes).set({ coachId }).where(eq(classes.classId, classId));

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
  type RoleType = (typeof allowedRoles)[number];

  if (!allowedRoles.includes(role as RoleType)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if( role === 'member') {
    return getAllMembers(req, res);
  }
  

  if( role === 'coach') {
    return getAllCoaches(req, res);
  }

  if( role === 'admin') {
    return getAllAdmins(req, res);
  }

  

};

// GET /users/allUsers
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: userroles.userRole,
        bio: coaches.bio,
        authorisation: admins.authorisation,
        status: members.status,
        creditsBalance: members.creditsBalance,
      })
      .from(users)
      .leftJoin(userroles, eq(users.userId, userroles.userId)) // Join role first to match field order
      .leftJoin(coaches, eq(users.userId, coaches.userId))
      .leftJoin(admins, eq(users.userId, admins.userId))
      .leftJoin(members, eq(users.userId, members.userId))
      .orderBy(asc(users.lastName), asc(users.firstName));

    res.json(result);
  } catch (err) {
    console.error('Failed to get all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};


// POST /users/removeCoachRole
export const removeCoachRole = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  await db.delete(coaches).where(eq(coaches.userId, userId));

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

  await db.delete(members).where(eq(members.userId, userId));

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

  await db.delete(admins).where(eq(admins.userId, userId));

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

  await db.delete(managers).where(eq(managers.userId, userId));

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

//Get roles by userId
export const getRolesByUserId = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  const roles = await db
    .select({ role: userroles.userRole })
    .from(userroles)
    .where(eq(userroles.userId, userId));

  if (roles.length === 0) {
    return res.status(404).json({ error: 'No roles found for this user' });
  }

  res.json(roles.map((r) => r.role));
};

//Get user by userId
export const getUserById = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    const result = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        roles: userroles.userRole,
        bio: coaches.bio,
        status: members.status,
        creditsBalance: members.creditsBalance,
        authorisation: admins.authorisation,
      })
      .from(users)
      .leftJoin(userroles, eq(users.userId, userroles.userId))
      .leftJoin(coaches, eq(users.userId, coaches.userId))
      .leftJoin(members, eq(users.userId, members.userId))
      .leftJoin(admins, eq(users.userId, admins.userId))
      .where(eq(users.userId, userId));

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Consolidate roles and details
    const base = {
      userId: result[0].userId,
      firstName: result[0].firstName,
      lastName: result[0].lastName,
      email: result[0].email,
      phone: result[0].phone,
      roles: result.map((r) => r.roles).filter(Boolean),
    };

    for (const row of result) {
      if (row.roles === 'coach') {
        Object.assign(base, { bio: row.bio });
      } else if (row.roles === 'member') {
        Object.assign(base, {
          status: row.status,
          creditsBalance: row.creditsBalance,
        });
      } else if (row.roles === 'admin') {
        Object.assign(base, { authorisation: row.authorisation });
      }
    }

    return res.json(base);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};


//EDIT USER DETAILS 
export const updateUserById = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const updates = req.body;

  try {
    // Step 1: Get user role
    const [userRoleRow] = await db
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, Number(userId)));

    if (!userRoleRow) {
      return res.status(404).json({ error: 'User role not found' });
    }

    const role = userRoleRow.role;

    // Step 2: Update shared user fields
    const userFieldsToUpdate = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      email: updates.email,
      phone: updates.phone,
    };

    const filteredUserFields = Object.fromEntries(
      Object.entries(userFieldsToUpdate).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(filteredUserFields).length > 0) {
      await db
        .update(users)
        .set(filteredUserFields)
        .where(eq(users.userId, Number(userId)));
    }

    // Step 3: Role-specific updates
    if (role === 'coach') {
      const coachFields = {
        bio: updates.bio,
      };
      const filteredCoachFields = Object.fromEntries(
        Object.entries(coachFields).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(filteredCoachFields).length > 0) {
        await db
          .update(coaches)
          .set(filteredCoachFields)
          .where(eq(coaches.userId, Number(userId)));
      }
    }

    if (role === 'admin') {
      const adminFields = {
        authorisation: updates.authorisation,
      };
      const filteredAdminFields = Object.fromEntries(
        Object.entries(adminFields).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(filteredAdminFields).length > 0) {
        await db
          .update(admins)
          .set(filteredAdminFields)
          .where(eq(admins.userId, Number(userId)));
      }
    }

    if (role === 'member') {
      const memberFields = {
        status: updates.status,
        creditsBalance: updates.creditsBalance,
      };
      const filteredMemberFields = Object.fromEntries(
        Object.entries(memberFields).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(filteredMemberFields).length > 0) {
        await db
          .update(members)
          .set(filteredMemberFields)
          .where(eq(members.userId, Number(userId)));
      }
    }

    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};



export const getAllCoaches = async (req: Request, res: Response) => {
  return db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      bio: coaches.bio,
    })
    .from(users)
    .innerJoin(coaches, eq(users.userId, coaches.userId))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch coaches' });
    });
};

export const getAllAdmins = async (req: Request, res: Response) => {
  return db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      role: userroles.userRole, // must come after the join!
      authorisation: admins.authorisation,
    })
    .from(users)
    .innerJoin(admins, eq(users.userId, admins.userId))
    .innerJoin(userroles, eq(users.userId, userroles.userId)) // <- REQUIRED
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admins' });
    });
};


>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3
