import { IAdminService, IAdminRepository } from '../../domain/interfaces/class.interface';
import { Class, CreateClassRequest, WeeklyScheduleInput } from '../../domain/entities/class.entity';
import { AdminRepository } from '../../repositories/admin/adminRepository';
import { AnalyticsService } from '../analytics/analyticsService';

/**
 * AdminService - Business Layer
 * Contains all business logic for admin operations
 */
export class AdminService implements IAdminService {
  private adminRepository: IAdminRepository;
  private analyticsService: AnalyticsService;

  constructor(adminRepository?: IAdminRepository, analyticsService?: AnalyticsService) {
    this.adminRepository = adminRepository || new AdminRepository();
    this.analyticsService = analyticsService || new AnalyticsService();
  }

  async createWeeklySchedule(request: {
    startDate: string;
    createdBy: number;
    weeklySchedule: WeeklyScheduleInput;
  }): Promise<any[]> {
    return this.adminRepository.createWeeklySchedule(
      request.startDate,
      request.createdBy,
      request.weeklySchedule,
    );
  }

  async getWeeklySchedule(): Promise<any> {
    return this.adminRepository.getWeeklySchedule();
  }

  async createClass(request: CreateClassRequest): Promise<Class> {
    const newClass = await this.adminRepository.createClass(request);
    await this.analyticsService.addLog({
      gymId: 1, // Assuming a single gym for now
      userId: request.createdBy,
      eventType: 'class_creation',
      properties: {
        classId: newClass.classId,
        scheduledDate: newClass.scheduledDate,
        scheduledTime: newClass.scheduledTime,
      },
      source: 'api',
    });
    return newClass;
  }

  async assignCoachToClass(
    classId: number,
    coachId: number,
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!classId || !coachId) {
      throw new Error('classId and coachId are required');
    }

    return this.adminRepository.assignCoachToClass(classId, coachId);
  }

  async assignUserToRole(userId: number, role: string): Promise<{ ok: boolean; reason?: string }> {
    if (!userId || !role) {
      throw new Error('Missing userId or role');
    }

    const allowedRoles = ['coach', 'member', 'admin', 'manager'];
    if (!allowedRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    const result = await this.adminRepository.assignUserToRole(userId, role);

    if (result.ok) {
      await this.analyticsService.addLog({
        gymId: 1, // Assuming a single gym for now
        userId: undefined, //add admin id
        eventType: 'user_role_assignment',
        properties: {
          assignedUserId: userId,
          role: role,
        },
        source: 'api',
      });
    }

    return result;
  }

  async getAllMembers(): Promise<any[]> {
    return this.adminRepository.getAllMembers();
  }

  async getUsersByRole(role: string): Promise<any[]> {
    const allowed = ['coach', 'member', 'admin', 'manager'] as const;
    if (!allowed.includes(role as any)) {
      throw new Error('Invalid role');
    }

    return this.adminRepository.getUsersByRole(role);
  }

  async getAllUsers(): Promise<any[]> {
    return this.adminRepository.getAllUsers();
  }

  async removeRole(userId: number, role: string): Promise<void> {
    if (!userId) {
      throw new Error('Missing userId');
    }

    const allowedRoles = ['coach', 'member', 'admin', 'manager'];
    if (!allowedRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    await this.adminRepository.removeRole(userId, role);
  }

  async getRolesByUserId(userId: number): Promise<string[]> {
    if (Number.isNaN(userId)) {
      throw new Error('Invalid userId');
    }

    const roles = await this.adminRepository.getRolesByUserId(userId);
    if (roles.length === 0) {
      throw new Error('No roles found for this user');
    }

    return roles;
  }

  async getUserById(userId: number): Promise<any> {
    if (Number.isNaN(userId)) {
      throw new Error('Invalid userId');
    }

    const user = await this.adminRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateUserById(userId: number, updates: any): Promise<{ ok: boolean; reason?: string }> {
    if (Number.isNaN(userId)) {
      throw new Error('Invalid userId');
    }

    return this.adminRepository.updateUserById(userId, updates);
  }

  async updateUserRole(userId: number, newRole: string): Promise<{ ok: boolean; reason?: string }> {
    const allowedRoles = ['coach', 'member', 'admin', 'manager'];
    if (!allowedRoles.includes(newRole)) {
      throw new Error('Invalid role');
    }

    try {
      const currentRoles = await this.adminRepository.getRolesByUserId(userId);
      for (const role of currentRoles) {
        await this.adminRepository.removeRole(userId, role);
      }
    } catch (error) {
      // Ignore if user has no roles
    }

    const result = await this.adminRepository.assignUserToRole(userId, newRole);

    if (result.ok) {
      await this.analyticsService.addLog({
        gymId: 1, // Assuming a single gym for now
        userId: undefined, // TODO: Add admin ID
        eventType: 'user_role_update',
        properties: {
          updatedUserId: userId,
          newRole: newRole,
        },
        source: 'api',
      });
    }

    return result;
  }

  async approveMembership(userId: number): Promise<{ ok: boolean; reason?: string }> {
    const result = await this.adminRepository.assignUserToRole(userId, 'member');

    if (result.ok) {
      await this.analyticsService.addLog({
        gymId: 1, // Assuming a single gym for now
        userId: undefined,
        eventType: 'membership_approval',
        properties: {
          approvedUserId: userId,
        },
        source: 'api',
      });
    }

    return result;
  }
}
