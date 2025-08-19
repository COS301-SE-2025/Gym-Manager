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
  }
};

export const createClass = async (req: AuthenticatedRequest, res: Response) => {
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
