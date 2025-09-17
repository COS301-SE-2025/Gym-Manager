import { AdminRepository } from '../../../repositories/admin/adminRepository';
import { builder } from '../../builder';
import {
  classes,
  coaches,
  workouts,
  userroles,
  members,
  admins,
  managers,
  users,
} from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15'; 
    }
    return '2024-01-15T10:00:00';
  }),
  parseISO: jest.fn((dateStr) => new Date('2024-01-15T00:00:00Z')),
}));

describe('AdminRepository', () => {
  let adminRepository: AdminRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    adminRepository = new AdminRepository();
  });

  describe('createWeeklySchedule', () => {
    it('should create classes for each day in the weekly schedule', async () => {
      // Arrange
      const startDate = '2024-01-15';
      const createdBy = 1;
      const weeklySchedule = [
        {
          day: 'Monday',
          classes: [
            {
              time: '09:00',
              durationMinutes: 60,
              capacity: 20,
              coachId: 1,
              workoutId: 1,
            },
            {
              time: '18:00',
              durationMinutes: 45,
              capacity: 15,
              coachId: 2,
              workoutId: 2,
            },
          ],
        },
        {
          day: 'Tuesday',
          classes: [
            {
              time: '10:00',
              durationMinutes: 60,
              capacity: 20,
              coachId: 1,
              workoutId: 1,
            },
          ],
        },
      ];

      const mockInsertedClasses = [
        { classId: 1, scheduledDate: '2024-01-15', scheduledTime: '09:00' },
        { classId: 2, scheduledDate: '2024-01-15', scheduledTime: '18:00' },
        { classId: 3, scheduledDate: '2024-01-16', scheduledTime: '10:00' },
      ];

      mockDb.insert.mockReturnValue(builder(mockInsertedClasses));

      const result = await adminRepository.createWeeklySchedule(
        startDate,
        createdBy,
        weeklySchedule
      );


      expect(mockDb.insert).toHaveBeenCalledTimes(3); // 2 Monday classes + 1 Tuesday class
      expect(result).toEqual(mockInsertedClasses);
    });

    it('should handle empty weekly schedule', async () => {

      const startDate = '2024-01-15';
      const createdBy = 1;
      const weeklySchedule: any[] = [];


      const result = await adminRepository.createWeeklySchedule(
        startDate,
        createdBy,
        weeklySchedule
      );


      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should skip invalid days', async () => {

      const startDate = '2024-01-15';
      const createdBy = 1;
      const weeklySchedule = [
        {
          day: 'InvalidDay',
          classes: [
            {
              time: '09:00',
              durationMinutes: 60,
              capacity: 20,
            },
          ],
        },
      ];


      const result = await adminRepository.createWeeklySchedule(
        startDate,
        createdBy,
        weeklySchedule
      );


      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getWeeklySchedule', () => {
    it('should return grouped classes for the current week', async () => {

      const mockClasses = [
        {
          classId: 1,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          capacity: 20,
          workoutName: 'Morning HIIT',
          coachName: 'John',
        },
        {
          classId: 2,
          scheduledDate: '2024-01-15',
          scheduledTime: '18:00',
          durationMinutes: 45,
          capacity: 15,
          workoutName: 'Evening HIIT',
          coachName: 'Jane',
        },
        {
          classId: 3,
          scheduledDate: '2024-01-16',
          scheduledTime: '10:00',
          durationMinutes: 60,
          capacity: 20,
          workoutName: 'Midday HIIT',
          coachName: 'Bob',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockClasses));


      const result = await adminRepository.getWeeklySchedule();


      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({
        '2024-01-15': [mockClasses[0], mockClasses[1]],
        '2024-01-16': [mockClasses[2]],
      });
    });

    it('should return empty object when no classes found', async () => {

      mockDb.select.mockReturnValue(builder([]));


      const result = await adminRepository.getWeeklySchedule();


      expect(result).toEqual({});
    });
  });

  describe('createClass', () => {
    it('should create a new class and return mapped Class entity', async () => {

      const payload = {
        capacity: 20,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        createdBy: 1,
      };

      const mockCreatedClass = {
        classId: 1,
        capacity: 20,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        createdBy: 1,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockCreatedClass]));

      const result = await adminRepository.createClass(payload);

      expect(mockDb.insert).toHaveBeenCalledWith(classes);
      expect(result).toEqual({
        classId: 1,
        capacity: 20,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        createdBy: 1,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
    });

    it('should handle optional fields being null/undefined', async () => {

      const payload = {
        capacity: 20,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        createdBy: 1,
      };

      const mockCreatedClass = {
        classId: 1,
        capacity: 20,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: null,
        workoutId: null,
        createdBy: 1,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockCreatedClass]));

      const result = await adminRepository.createClass(payload);

      expect(result.coachId).toBeUndefined();
      expect(result.workoutId).toBeUndefined();
    });
  });

  describe('assignCoachToClass', () => {
    it('should assign coach to class when coach exists', async () => {

      const classId = 1;
      const coachId = 2;
      const mockCoach = { userId: 2, bio: 'Experienced coach' };

      mockDb.select.mockReturnValue(builder([mockCoach]));
      mockDb.update.mockReturnValue(builder());


      const result = await adminRepository.assignCoachToClass(classId, coachId);


      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('should return error when coach does not exist', async () => {

      const classId = 1;
      const coachId = 999;

      mockDb.select.mockReturnValue(builder([]));


      const result = await adminRepository.assignCoachToClass(classId, coachId);


      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: 'invalid_coach' });
    });
  });

  describe('assignUserToRole', () => {
    it('should assign coach role to user successfully', async () => {

      const userId = 1;
      const role = 'coach';

      mockDb.select.mockReturnValue(builder([])); // No existing role
      mockDb.insert.mockReturnValue(builder());


      const result = await adminRepository.assignUserToRole(userId, role);


      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + coaches table
      expect(result).toEqual({ ok: true });
    });

    it('should assign member role to user successfully', async () => {

      const userId = 1;
      const role = 'member';

      mockDb.select.mockReturnValue(builder([]));
      mockDb.insert.mockReturnValue(builder());


      const result = await adminRepository.assignUserToRole(userId, role);


      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + members table
      expect(result).toEqual({ ok: true });
    });

    it('should assign admin role to user successfully', async () => {

      const userId = 1;
      const role = 'admin';

      mockDb.select.mockReturnValue(builder([]));
      mockDb.insert.mockReturnValue(builder());


      const result = await adminRepository.assignUserToRole(userId, role);


      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + admins table
      expect(result).toEqual({ ok: true });
    });

    it('should assign manager role to user successfully', async () => {
      const userId = 1;
      const role = 'manager';

      mockDb.select.mockReturnValue(builder([]));
      mockDb.insert.mockReturnValue(builder());

      const result = await adminRepository.assignUserToRole(userId, role);

      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + managers table
      expect(result).toEqual({ ok: true });
    });

    it('should return error when user already has the role', async () => {
      const userId = 1;
      const role = 'coach';
      const existingRole = { userId: 1, userRole: 'coach' };

      mockDb.select.mockReturnValue(builder([existingRole]));

      const result = await adminRepository.assignUserToRole(userId, role);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: 'already_has_role' });
    });
  });

  describe('getAllMembers', () => {
    it('should return all members with their details', async () => {
      const mockMembers = [
        {
          userId: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          status: 'approved',
          credits: 10,
        },
        {
          userId: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '098-765-4321',
          status: 'pending',
          credits: 5,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockMembers));

      const result = await adminRepository.getAllMembers();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockMembers);
    });
  });

  describe('getAllCoaches', () => {
    it('should return all coaches with their details', async () => {
      const mockCoaches = [
        {
          userId: 1,
          firstName: 'Coach',
          lastName: 'One',
          email: 'coach1@example.com',
          phone: '111-111-1111',
          bio: 'Experienced HIIT coach',
        },
        {
          userId: 2,
          firstName: 'Coach',
          lastName: 'Two',
          email: 'coach2@example.com',
          phone: '222-222-2222',
          bio: 'Certified fitness trainer',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockCoaches));

      const result = await adminRepository.getAllCoaches();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockCoaches);
    });
  });

  describe('getAllAdmins', () => {
    it('should return all admins with their details', async () => {
      const mockAdmins = [
        {
          userId: 1,
          firstName: 'Admin',
          lastName: 'One',
          email: 'admin1@example.com',
          phone: '333-333-3333',
          authorisation: 'full',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockAdmins));

      const result = await adminRepository.getAllAdmins();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockAdmins);
    });
  });

  describe('getUsersByRole', () => {
    it('should delegate to getAllMembers for member role', async () => {
      const mockMembers = [{ userId: 1, firstName: 'John' }];
      mockDb.select.mockReturnValue(builder(mockMembers));

      const result = await adminRepository.getUsersByRole('member');

      expect(result).toEqual(mockMembers);
    });

    it('should delegate to getAllCoaches for coach role', async () => {
      const mockCoaches = [{ userId: 1, firstName: 'Coach' }];
      mockDb.select.mockReturnValue(builder(mockCoaches));

      const result = await adminRepository.getUsersByRole('coach');

      expect(result).toEqual(mockCoaches);
    });

    it('should delegate to getAllAdmins for admin role', async () => {
      const mockAdmins = [{ userId: 1, firstName: 'Admin' }];
      mockDb.select.mockReturnValue(builder(mockAdmins));


      const result = await adminRepository.getUsersByRole('admin');

      expect(result).toEqual(mockAdmins);
    });

    it('should return managers for manager role', async () => {
      const mockManagers = [
        {
          userId: 1,
          firstName: 'Manager',
          lastName: 'One',
          email: 'manager@example.com',
          phone: '444-444-4444',
        },
      ];
      mockDb.select.mockReturnValue(builder(mockManagers));

      const result = await adminRepository.getUsersByRole('manager');

      expect(result).toEqual(mockManagers);
    });

    it('should return empty array for unknown role', async () => {
      const result = await adminRepository.getUsersByRole('unknown' as any);

      expect(result).toEqual([]);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with aggregated role information', async () => {

      const mockUsers = [
        {
          userId: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          role: 'member',
          bio: null,
          authorisation: null,
          status: 'approved',
          creditsBalance: 10,
        },
        {
          userId: 2,
          firstName: 'Coach',
          lastName: 'One',
          email: 'coach@example.com',
          phone: '111-111-1111',
          role: 'coach',
          bio: 'Experienced coach',
          authorisation: null,
          status: null,
          creditsBalance: null,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockUsers));


      const result = await adminRepository.getAllUsers();


      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('removeRole', () => {
    it('should remove coach role and related records', async () => {

      const userId = 1;
      const role = 'coach';

      mockDb.delete.mockReturnValue(builder());


      await adminRepository.removeRole(userId, role);


      expect(mockDb.delete).toHaveBeenCalledTimes(2); // coaches table + userroles table
    });

    it('should remove member role and related records', async () => {

      const userId = 1;
      const role = 'member';

      mockDb.delete.mockReturnValue(builder());


      await adminRepository.removeRole(userId, role);


      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it('should remove admin role and related records', async () => {

      const userId = 1;
      const role = 'admin';

      mockDb.delete.mockReturnValue(builder());


      await adminRepository.removeRole(userId, role);


      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it('should remove manager role and related records', async () => {

      const userId = 1;
      const role = 'manager';

      mockDb.delete.mockReturnValue(builder());

    
      await adminRepository.removeRole(userId, role);


      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRolesByUserId', () => {
    it('should return array of roles for a user', async () => {

      const userId = 1;
      const mockRoles = [
        { role: 'member' },
        { role: 'coach' },
      ];

      mockDb.select.mockReturnValue(builder(mockRoles));


      const result = await adminRepository.getRolesByUserId(userId);


      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(['member', 'coach']);
    });

    it('should return empty array when user has no roles', async () => {

      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));


      const result = await adminRepository.getRolesByUserId(userId);


      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should return user with single role', async () => {

      const userId = 1;
      const mockUserData = [
        {
          userId: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          roles: 'member',
          bio: null,
          status: 'approved',
          creditsBalance: 10,
          authorisation: null,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockUserData));


      const result = await adminRepository.getUserById(userId);


      expect(result).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        roles: ['member'],
        status: 'approved',
        creditsBalance: 10,
      });
    });

    it('should return user with multiple roles', async () => {

      const userId = 1;
      const mockUserData = [
        {
          userId: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          roles: 'member',
          bio: null,
          status: 'approved',
          creditsBalance: 10,
          authorisation: null,
        },
        {
          userId: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          roles: 'coach',
          bio: 'Experienced coach',
          status: 'approved',
          creditsBalance: 10,
          authorisation: null,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockUserData));


      const result = await adminRepository.getUserById(userId);


      expect(result).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        roles: ['member', 'coach'],
        bio: 'Experienced coach',
        status: 'approved',
        creditsBalance: 10,
      });
    });

    it('should return null when user not found', async () => {

      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));


      const result = await adminRepository.getUserById(userId);


      expect(result).toBeNull();
    });
  });

  describe('updateUserById', () => {
    it('should update user with coach role', async () => {

      const userId = 1;
      const updates = {
        firstName: 'UpdatedName',
        bio: 'Updated bio',
      };

      mockDb.select.mockReturnValue(builder([{ role: 'coach' }]));
      mockDb.update.mockReturnValue(builder());


      const result = await adminRepository.updateUserById(userId, updates);


      expect(mockDb.update).toHaveBeenCalledTimes(2); // users table + coaches table
      expect(result).toEqual({ ok: true });
    });

    it('should update user with member role', async () => {

      const userId = 1;
      const updates = {
        firstName: 'UpdatedName',
        status: 'suspended',
        creditsBalance: 15,
      };

      mockDb.select.mockReturnValue(builder([{ role: 'member' }]));
      mockDb.update.mockReturnValue(builder());


      const result = await adminRepository.updateUserById(userId, updates);


      expect(mockDb.update).toHaveBeenCalledTimes(2); // users table + members table
      expect(result).toEqual({ ok: true });
    });

    it('should update user with admin role', async () => {

      const userId = 1;
      const updates = {
        firstName: 'UpdatedName',
        authorisation: 'limited',
      };

      mockDb.select.mockReturnValue(builder([{ role: 'admin' }]));
      mockDb.update.mockReturnValue(builder());


      const result = await adminRepository.updateUserById(userId, updates);


      expect(mockDb.update).toHaveBeenCalledTimes(2); // users table + admins table
      expect(result).toEqual({ ok: true });
    });

    it('should only update users table when no role-specific fields provided', async () => {

      const userId = 1;
      const updates = {
        firstName: 'UpdatedName',
        email: 'updated@example.com',
      };

      mockDb.select.mockReturnValue(builder([{ role: 'coach' }]));
      mockDb.update.mockReturnValue(builder());

      
      const result = await adminRepository.updateUserById(userId, updates);

      
      expect(mockDb.update).toHaveBeenCalledTimes(1); // only users table
      expect(result).toEqual({ ok: true });
    });

    it('should return error when user role not found', async () => {
      
      const userId = 999;
      const updates = { firstName: 'UpdatedName' };

      mockDb.select.mockReturnValue(builder([]));

      
      const result = await adminRepository.updateUserById(userId, updates);

      
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, reason: 'role_not_found' });
    });

    it('should skip updates when no valid fields provided', async () => {
      
      const userId = 1;
      const updates = {
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        phone: undefined,
      };

      mockDb.select.mockReturnValue(builder([{ role: 'member' }]));

      
      const result = await adminRepository.updateUserById(userId, updates);

      
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });

  describe('utility functions', () => {
    describe('mapToClass', () => {
      it('should map database row to Class entity', () => {
                
        const adminRepo = adminRepository as any;
        
        const mockRow = {
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          workoutId: 1,
          createdBy: 1,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        };

        const result = adminRepo.mapToClass(mockRow);

        expect(result).toEqual({
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          workoutId: 1,
          createdBy: 1,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        });
      });

      it('should handle null coachId and workoutId', () => {
        const adminRepo = adminRepository as any;
        
        const mockRow = {
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: null,
          workoutId: null,
          createdBy: 1,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        };

        const result = adminRepo.mapToClass(mockRow);

        expect(result.coachId).toBeUndefined();
        expect(result.workoutId).toBeUndefined();
      });
    });
  });
});
