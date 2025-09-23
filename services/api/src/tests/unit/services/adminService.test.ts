import { AdminService } from '../../../services/admin/adminService';
import { AnalyticsService } from '../../../services/analytics/analyticsService';

describe('AdminService', () => {
  it('assignCoachToClass validates inputs and calls repository', async () => {
    const mockRepo = { assignCoachToClass: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    await expect(svc.assignCoachToClass(0 as any, 1)).rejects.toThrow('classId and coachId are required');
    await expect(svc.assignCoachToClass(1, 0 as any)).rejects.toThrow('classId and coachId are required');

    const result = await svc.assignCoachToClass(10, 20);
    expect(result).toEqual({ ok: true });
    expect(mockRepo.assignCoachToClass).toHaveBeenCalledWith(10, 20);
  });

  it('assignUserToRole validates roles', async () => {
    const mockRepo = { assignUserToRole: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    await expect(svc.assignUserToRole(1, 'bogus')).rejects.toThrow('Invalid role');
    await expect(svc.assignUserToRole(undefined as any, 'coach')).rejects.toThrow('Missing userId or role');
    const ok = await svc.assignUserToRole(1, 'coach');
    expect(ok).toEqual({ ok: true });
  });

  it('getRolesByUserId throws when empty', async () => {
    const mockRepo = { getRolesByUserId: jest.fn().mockResolvedValue([]) } as any;
    const svc = new AdminService(mockRepo);
    await expect(svc.getRolesByUserId(123)).rejects.toThrow('No roles found for this user');
  });

  it('getUserById throws when not found', async () => {
    const mockRepo = { getUserById: jest.fn().mockResolvedValue(null) } as any;
    const svc = new AdminService(mockRepo);
    await expect(svc.getUserById(5)).rejects.toThrow('User not found');
  });

  it('createClass validates inputs and calls repository', async () => {
    const mockRepo = { createClass: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    //await expect(svc.createClass({} as any)).rejects.toThrow('Missing required fields');
    const result = await svc.createClass({ capacity : 10, scheduledDate: '2025-01-01', scheduledTime: '09:00', durationMinutes: 60, createdBy: 1 });
  });

  it('createWeeklySchedule validates inputs and calls repository', async () => {
    const mockRepo = { createWeeklySchedule: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    //await expect(svc.createWeeklySchedule({} as any)).rejects.toThrow('Missing required fields');
    const result = await svc.createWeeklySchedule({ startDate: '2025-01-01', createdBy: 1, weeklySchedule: { monday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }], tuesday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }], wednesday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }], thursday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }], friday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }], saturday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }], sunday: [{ scheduledTime: '09:00', durationMinutes: 60, capacity: 10, coachId: 1, workoutId: 1 }] } });
  });

  it('getWeeklySchedule validates inputs and calls repository', async () => {
    const mockRepo = { getWeeklySchedule: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.getWeeklySchedule();
    expect(result).toEqual({ ok: true });
  });

  it('getAllMembers validates inputs and calls repository', async () => {
    const mockRepo = { getAllMembers: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.getAllMembers();
    expect(result).toEqual({ ok: true });
  });

  it('getUsersByRole validates inputs and calls repository', async () => {
    const mockRepo = { getUsersByRole: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.getUsersByRole('coach');
    expect(result).toEqual({ ok: true });
  });

  it('getAllUsers validates inputs and calls repository', async () => {
    const mockRepo = { getAllUsers: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.getAllUsers();
    expect(result).toEqual({ ok: true });
  });

  it('removeRole validates inputs and calls repository', async () => {
    const mockRepo = { removeRole: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.removeRole(1, 'coach');
    //expect(result).toEqual({ ok: true });
  });

  it('getRolesByUserId validates inputs and calls repository', async () => {
    const mockRepo = { getRolesByUserId: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.getRolesByUserId(1);
    expect(result).toEqual({ ok: true });
  });

  it('getUserById validates inputs and calls repository', async () => {
    const mockRepo = { getUserById: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const svc = new AdminService(mockRepo);

    const result = await svc.getUserById(1);
    expect(result).toEqual({ ok: true });
  });

  it('updateUserById logs membership approval event when status changes to approved', async () => {
    const mockRepo = { 
      getUserById: jest.fn().mockResolvedValue({ 
        userId: 1, 
        roles: ['member'], 
        memberStatus: 'pending' 
      }),
      updateUserById: jest.fn().mockResolvedValue({ ok: true })
    } as any;
    
    const mockAnalyticsService = { addLog: jest.fn() } as any;
    const svc = new AdminService(mockRepo, mockAnalyticsService);

    const result = await svc.updateUserById(1, { status: 'approved' });

    expect(mockRepo.getUserById).toHaveBeenCalledWith(1);
    expect(mockAnalyticsService.addLog).toHaveBeenCalledWith({
      gymId: 1,
      userId: null,
      eventType: 'membership_approval',
      properties: {
        approvedUserId: 1,
      },
      source: 'api',
    });
    expect(mockRepo.updateUserById).toHaveBeenCalledWith(1, { status: 'approved' });
    expect(result).toEqual({ ok: true });
  });

  it('updateUserById does not log membership approval when user is not a member', async () => {
    const mockRepo = { 
      getUserById: jest.fn().mockResolvedValue({ 
        userId: 1, 
        roles: ['admin'], 
        memberStatus: null 
      }),
      updateUserById: jest.fn().mockResolvedValue({ ok: true })
    } as any;
    
    const mockAnalyticsService = { addLog: jest.fn() } as any;
    const svc = new AdminService(mockRepo, mockAnalyticsService);

    const result = await svc.updateUserById(1, { status: 'approved' });

    expect(mockRepo.getUserById).toHaveBeenCalledWith(1);
    expect(mockAnalyticsService.addLog).not.toHaveBeenCalled();
    expect(mockRepo.updateUserById).toHaveBeenCalledWith(1, { status: 'approved' });
    expect(result).toEqual({ ok: true });
  });

  it('updateUserById does not log membership approval when member is already approved', async () => {
    const mockRepo = { 
      getUserById: jest.fn().mockResolvedValue({ 
        userId: 1, 
        roles: ['member'], 
        memberStatus: 'approved' 
      }),
      updateUserById: jest.fn().mockResolvedValue({ ok: true })
    } as any;
    
    const mockAnalyticsService = { addLog: jest.fn() } as any;
    const svc = new AdminService(mockRepo, mockAnalyticsService);

    const result = await svc.updateUserById(1, { status: 'approved' });

    expect(mockRepo.getUserById).toHaveBeenCalledWith(1);
    expect(mockAnalyticsService.addLog).not.toHaveBeenCalled();
    expect(mockRepo.updateUserById).toHaveBeenCalledWith(1, { status: 'approved' });
    expect(result).toEqual({ ok: true });
  });

  
});


