import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { AdminService } from '../../services/admin/adminService';
import {
  WeeklyScheduleRequest,
  AssignRoleRequest,
  RemoveRoleRequest,
  UpdateUserRequest,
} from '../../domain/entities/admin.entity';
import { CreateClassRequest } from '../../domain/entities/class.entity';

/**
 * AdminController - Controller Layer
 * Handles HTTP requests/responses and delegates business logic to service layer
 */
export class AdminController {
  private adminService: AdminService;

  constructor(adminService?: AdminService) {
    this.adminService = adminService || new AdminService();
  }

  createWeeklySchedule = async (req: Request, res: Response) => {
    try {
      const { startDate, createdBy, weeklySchedule } = req.body as WeeklyScheduleRequest;

      const request: WeeklyScheduleRequest = {
        startDate,
        createdBy,
        weeklySchedule,
      };

      const inserted = await this.adminService.createWeeklySchedule(request);
      return res.status(201).json({ success: true, insertedClasses: inserted });
    } catch (error: any) {
      console.error('createWeeklySchedule error:', error);
      return res.status(500).json({ error: 'Failed to create weekly schedule' });
    }
  };

  getWeeklySchedule = async (_req: Request, res: Response) => {
    try {
      const grouped = await this.adminService.getWeeklySchedule();
      return res.json(grouped);
    } catch (error: any) {
      console.error('getWeeklySchedule error:', error);
      return res.status(500).json({ error: 'Failed to fetch weekly schedule' });
    }
  };

  createClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = req.body as CreateClassRequest;
      const created = await this.adminService.createClass(payload);
      return res.json(created);
    } catch (error: any) {
      console.error('createClass error:', error);
      return res.status(500).json({ error: 'Failed to create class' });
    }
  };

  assignCoach = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { classId, coachId } = req.body as { classId: number; coachId: number };

      const result = await this.adminService.assignCoachToClass(classId, coachId);
      if (!result.ok && result.reason === 'invalid_coach') {
        return res.status(400).json({ error: 'Invalid coach' });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('assignCoach error:', error);

      if (error.message === 'classId and coachId are required') {
        return res.status(400).json({ error: 'classId and coachId are required' });
      }

      return res.status(500).json({ error: 'Failed to assign coach' });
    }
  };

  updateClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      if (!Number.isFinite(classId)) {
        return res.status(400).json({ error: 'Invalid class ID' });
      }

      const updates = req.body as {
        capacity?: number;
        scheduledDate?: string;
        scheduledTime?: string;
        durationMinutes?: number;
        coachId?: number | null;
      };

      const updatedClass = await this.adminService.updateClass(classId, updates);
      return res.json({ success: true, class: updatedClass });
    } catch (error: any) {
      console.error('updateClass error:', error);

      if (error.message === 'classId is required') {
        return res.status(400).json({ error: 'classId is required' });
      }

      if (error.message === 'Class not found') {
        return res.status(404).json({ error: 'Class not found' });
      }

      return res.status(500).json({ error: 'Failed to update class' });
    }
  };

  deleteClass = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const classId = Number(req.params.classId);
      if (!Number.isFinite(classId)) {
        return res.status(400).json({ error: 'Invalid class ID' });
      }

      const deleted = await this.adminService.deleteClass(classId);
      if (!deleted) {
        return res.status(404).json({ error: 'Class not found' });
      }

      return res.json({ success: true, message: 'Class deleted successfully' });
    } catch (error: any) {
      console.error('deleteClass error:', error);

      if (error.message === 'classId is required') {
        return res.status(400).json({ error: 'classId is required' });
      }

      return res.status(500).json({ error: 'Failed to delete class' });
    }
  };

  assignUserToRole = async (req: Request, res: Response) => {
    try {
      const { userId, role } = req.body as AssignRoleRequest;

      const result = await this.adminService.assignUserToRole(userId, role);
      if (!result.ok && result.reason === 'already_has_role') {
        return res.status(409).json({ error: 'User already has this role' });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('assignUserToRole error:', error);

      if (error.message === 'Missing userId or role') {
        return res.status(400).json({ error: 'Missing userId or role' });
      }

      if (error.message === 'Invalid role') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      return res.status(500).json({ error: 'Failed to assign role' });
    }
  };

  getAllMembers = async (_req: Request, res: Response) => {
    try {
      const members = await this.adminService.getAllMembers();
      return res.json(members);
    } catch (error: any) {
      console.error('getAllMembers error:', error);
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  };

  getUsersByRole = async (req: Request, res: Response) => {
    try {
      const role = req.params.role as 'coach' | 'member' | 'admin' | 'manager';
      const rows = await this.adminService.getUsersByRole(role);
      return res.json(rows);
    } catch (error: any) {
      console.error('getUsersByRole error:', error);

      if (error.message === 'Invalid role') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      return res.status(500).json({ error: 'Failed to fetch users by role' });
    }
  };

  getAllUsers = async (_req: Request, res: Response) => {
    try {
      const rows = await this.adminService.getAllUsers();
      return res.json(rows);
    } catch (error: any) {
      console.error('getAllUsers error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  };

  removeCoachRole = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as RemoveRoleRequest;
      await this.adminService.removeRole(userId, 'coach');
      return res.json({ success: true });
    } catch (error: any) {
      console.error('removeCoachRole error:', error);

      if (error.message === 'Missing userId') {
        return res.status(400).json({ error: 'Missing userId' });
      }

      if (error.message === 'Invalid role') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      return res.status(500).json({ error: 'Failed to remove coach role' });
    }
  };

  removeMemberRole = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as RemoveRoleRequest;
      await this.adminService.removeRole(userId, 'member');
      return res.json({ success: true });
    } catch (error: any) {
      console.error('removeMemberRole error:', error);

      if (error.message === 'Missing userId') {
        return res.status(400).json({ error: 'Missing userId' });
      }

      if (error.message === 'Invalid role') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      return res.status(500).json({ error: 'Failed to remove member role' });
    }
  };

  removeAdminRole = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as RemoveRoleRequest;
      await this.adminService.removeRole(userId, 'admin');
      return res.json({ success: true });
    } catch (error: any) {
      console.error('removeAdminRole error:', error);

      if (error.message === 'Missing userId') {
        return res.status(400).json({ error: 'Missing userId' });
      }

      if (error.message === 'Invalid role') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      return res.status(500).json({ error: 'Failed to remove admin role' });
    }
  };

  removeManagerRole = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as RemoveRoleRequest;
      await this.adminService.removeRole(userId, 'manager');
      return res.json({ success: true });
    } catch (error: any) {
      console.error('removeManagerRole error:', error);

      if (error.message === 'Missing userId') {
        return res.status(400).json({ error: 'Missing userId' });
      }

      if (error.message === 'Invalid role') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      return res.status(500).json({ error: 'Failed to remove manager role' });
    }
  };

  getRolesByUserId = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const roles = await this.adminService.getRolesByUserId(userId);
      return res.json(roles);
    } catch (error: any) {
      console.error('getRolesByUserId error:', error);

      if (error.message === 'Invalid userId') {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      if (error.message === 'No roles found for this user') {
        return res.status(404).json({ error: 'No roles found for this user' });
      }

      return res.status(500).json({ error: 'Failed to fetch roles' });
    }
  };

  getUserById = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const user = await this.adminService.getUserById(userId);
      return res.json(user);
    } catch (error: any) {
      console.error('getUserById error:', error);

      if (error.message === 'Invalid userId') {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  };

  updateUserById = async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      const updates = req.body;

      const result = await this.adminService.updateUserById(userId, updates);
      if (!result.ok && result.reason === 'role_not_found') {
        return res.status(404).json({ error: 'User role not found' });
      }

      return res.status(200).json({ message: 'User updated successfully' });
    } catch (error: any) {
      console.error('updateUserById error:', error);

      if (error.message === 'Invalid userId') {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      return res.status(500).json({ error: 'Failed to update user' });
    }
  };
}
