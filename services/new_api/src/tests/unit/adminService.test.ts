import { AdminService } from '../../services/admin/adminService';

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
});


