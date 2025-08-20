import { IAdminService, IAdminRepository } from '../../domain/interfaces/class.interface';
import {
  Class,
  CreateClassRequest,
  WeeklyScheduleInput
} from '../../domain/entities/class.entity';

/**
 * AdminService - Business Layer
 * Contains all business logic for admin operations
 */
export class AdminService implements IAdminService {
  private adminRepository: IAdminRepository;

  constructor(adminRepository: IAdminRepository) {
    this.adminRepository = adminRepository;
  }

  async createWeeklySchedule(request: { startDate: string; createdBy: number; weeklySchedule: WeeklyScheduleInput }): Promise<any[]> {
    return this.adminRepository.createWeeklySchedule(
      request.startDate,
      request.createdBy,
      request.weeklySchedule
    );
  }

  async getWeeklySchedule(): Promise<any> {
    return this.adminRepository.getWeeklySchedule();
  }

  async createClass(request: CreateClassRequest): Promise<Class> {
    return this.adminRepository.createClass(request);
  }

  async assignCoachToClass(classId: number, coachId: number): Promise<{ ok: boolean; reason?: string }> {
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

    return this.adminRepository.assignUserToRole(userId, role);
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
}
