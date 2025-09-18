import { UserRepository } from '../../../repositories/auth/userRepository';
import { builder } from '../../builder';
import {
  users,
  userroles,
  members,
  coaches,
  admins,
  managers,
} from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    userRepository = new UserRepository();
  });

  describe('findByEmail', () => {
    it('should return user when email exists', async () => {

      const email = 'jason@example.com';
      const mockUserRow = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: '1234567890',
        passwordHash: 'hashed_password',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockDb.select.mockReturnValue(builder([mockUserRow]));

      const result = await userRepository.findByEmail(email);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: '1234567890',
        passwordHash: 'hashed_password',
      });
    });

    it('should return null when email does not exist', async () => {
      const email = 'nonexistent@example.com';
      mockDb.select.mockReturnValue(builder([]));

      const result = await userRepository.findByEmail(email);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle phone being null', async () => {
      const email = 'jason@example.com';
      const mockUserRow = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: null,
        passwordHash: 'hashed_password',
      };

      mockDb.select.mockReturnValue(builder([mockUserRow]));

      const result = await userRepository.findByEmail(email);

      expect(result?.phone).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should return user when ID exists', async () => {
      const userId = 1;
      const mockUserRow = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: '1234567890',
        passwordHash: 'hashed_password',
      };

      mockDb.select.mockReturnValue(builder([mockUserRow]));

      const result = await userRepository.findById(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: '1234567890',
        passwordHash: 'hashed_password',
      });
    });

    it('should return null when ID does not exist', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await userRepository.findById(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create and return new user', async () => {
      const userData = {
        firstName: 'Jared',
        lastName: 'Hurlimam',
        email: 'jared@example.com',
        phone: '0987654321',
        passwordHash: 'hashed_password',
      };

      const mockCreatedUser = {
        userId: 2,
        ...userData,
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockCreatedUser]));

      const result = await userRepository.createUser(userData);

      expect(mockDb.insert).toHaveBeenCalledWith(users);
      expect(result).toEqual({
        userId: 2,
        firstName: 'Jared',
        lastName: 'Hurlimam',
        email: 'jared@example.com',
        phone: '0987654321',
        passwordHash: 'hashed_password',
      });
    });

    it('should handle optional fields', async () => {
      const userData = {
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        passwordHash: 'hashed_password',
      };

      const mockCreatedUser = {
        userId: 1,
        ...userData,
        phone: null,
      };

      mockDb.insert.mockReturnValue(builder([mockCreatedUser]));

      const result = await userRepository.createUser(userData);

      expect(result.phone).toBeUndefined();
    });
  });

  describe('createUserWithRoles', () => {
    it('should create user and assign roles using transaction', async () => {
      const userData = {
        firstName: 'Vansh',
        lastName: 'Sood',
        email: 'vansh@example.com',
        passwordHash: 'hashed_password',
      };
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['admin', 'member'];

      const mockCreatedUser = {
        userId: 3,
        ...userData,
      };

      const mockTransaction = {
        select: jest.fn().mockReturnValue(builder([])),
        insert: jest.fn().mockReturnValue(builder([mockCreatedUser])),
        update: jest.fn().mockReturnValue(builder()),
        delete: jest.fn().mockReturnValue(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await userRepository.createUserWithRoles(userData, roles);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 3,
        firstName: 'Vansh',
        lastName: 'Sood',
        email: 'vansh@example.com',
        passwordHash: 'hashed_password',
      });
    });

    it('should create user without roles when empty array provided', async () => {
      const userData = {
        firstName: 'Dennis',
        lastName: 'Woodly',
        email: 'dennis@example.com',
        passwordHash: 'hashed_password',
      };
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = [];

      const mockCreatedUser = {
        userId: 4,
        ...userData,
      };

      const mockTransaction = {
        select: jest.fn().mockReturnValue(builder([])),
        insert: jest.fn().mockReturnValue(builder([mockCreatedUser])),
        update: jest.fn().mockReturnValue(builder()),
        delete: jest.fn().mockReturnValue(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await userRepository.createUserWithRoles(userData, roles);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 4,
        firstName: 'Dennis',
        lastName: 'Woodly',
        email: 'dennis@example.com',
        passwordHash: 'hashed_password',
      });
    });
  });

  describe('getRolesByUserId', () => {
    it('should return array of roles for user', async () => {

      const userId = 1;
      const mockRoles = [
        { role: 'member' },
        { role: 'coach' },
      ];

      mockDb.select.mockReturnValue(builder(mockRoles));


      const result = await userRepository.getRolesByUserId(userId);


      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(['member', 'coach']);
    });

    it('should return empty array when user has no roles', async () => {

      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));


      const result = await userRepository.getRolesByUserId(userId);


      expect(result).toEqual([]);
    });
  });

  describe('getMemberStatus', () => {
    it('should return member status when user is a member', async () => {

      const userId = 1;
      const mockMember = { status: 'approved' };

      mockDb.select.mockReturnValue(builder([mockMember]));


      const result = await userRepository.getMemberStatus(userId);


      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe('approved');
    });

    it('should return null when user is not a member', async () => {

      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

        
      const result = await userRepository.getMemberStatus(userId);


      expect(result).toBeNull();
    });

    it('should handle different member statuses', async () => {

      const testCases = [
        { status: 'pending' },
        { status: 'suspended' },
        { status: 'cancelled' },
      ];

      for (const testCase of testCases) {
        mockDb.select.mockReturnValue(builder([testCase]));

        const result = await userRepository.getMemberStatus(1);
        expect(result).toBe(testCase.status);
      }
    });
  });

  describe('updateUser', () => {
    it('should update and return updated user', async () => {

      const userId = 1;
      const updates = {
        firstName: 'Amadeus',
        phone: '5555555555',
      };

      const mockUpdatedUser = {
        userId: 1,
        firstName: 'Amadeus',
        lastName: 'Doe',
        email: 'jason@example.com',
        phone: '5555555555',
        passwordHash: 'hashed_password',
      };

      mockDb.update.mockReturnValue(builder([mockUpdatedUser]));


      const result = await userRepository.updateUser(userId, updates);


      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 1,
        firstName: 'Amadeus',
        lastName: 'Doe',
        email: 'jason@example.com',
        phone: '5555555555',
        passwordHash: 'hashed_password',
      });
    });

    it('should return null when user not found', async () => {

      const userId = 999;
      const updates = { firstName: 'Amadeus' };

      mockDb.update.mockReturnValue(builder([]));


      const result = await userRepository.updateUser(userId, updates);


      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user by ID', async () => {

      const userId = 1;
      mockDb.delete.mockReturnValue(builder());


      await userRepository.deleteUser(userId);


      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('assignRoles', () => {
    beforeEach(() => {
      mockDb.select.mockReturnValue(builder([])); // No existing roles/records
      mockDb.insert.mockReturnValue(builder());
    });

    it('should assign member role and create member record', async () => {
      
      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['member'];

      
      await userRepository.assignRoles(userId, roles);

      
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + members table
    });

    it('should assign coach role and create coach record', async () => {
      
      const userId = 1;

      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['coach'];

      
      await userRepository.assignRoles(userId, roles);

      
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + coaches table
    });

    it('should assign admin role and create admin record', async () => {
      
      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['admin'];

      
      await userRepository.assignRoles(userId, roles);

      
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + admins table
    });

    it('should assign manager role and create manager record', async () => {
      
      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['manager'];

      
      await userRepository.assignRoles(userId, roles);

      
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // userroles + managers table
    });

    it('should assign multiple roles', async () => {

      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['member', 'coach'];


      await userRepository.assignRoles(userId, roles);


      expect(mockDb.insert).toHaveBeenCalledTimes(3); // userroles + members + coaches tables
    });

    it('should skip existing roles', async () => {

      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['member', 'coach'];
      const existingRoles = [{ userRole: 'member' }];

      // Clear previous mock calls
      mockDb.insert.mockClear();
      
      mockDb.select
        .mockReturnValueOnce(builder(existingRoles)) // existing roles check
        .mockReturnValue(builder([])); // other selects return empty

      await userRepository.assignRoles(userId, roles);

      // Should insert: 1) coach role to userroles, 2) member record (role exists but record may not), 3) coach record
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });

    it('should not create specialized record if it already exists', async () => {

      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['member'];
      const existingMember = [{ userId: 1, status: 'approved' }];

      mockDb.select
        .mockReturnValueOnce(builder([])) // no existing roles
        .mockReturnValueOnce(builder(existingMember)); // existing member record


      await userRepository.assignRoles(userId, roles);


      expect(mockDb.insert).toHaveBeenCalledTimes(1); // only userroles, not members table
    });

    it('should handle all role types in one assignment', async () => {

      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = ['member', 'coach', 'admin', 'manager'];


      await userRepository.assignRoles(userId, roles);


      expect(mockDb.insert).toHaveBeenCalledTimes(5); // userroles + 4 specialized tables
    });
  });

  describe('mapToUser utility', () => {
    it('should map database row to User entity correctly', () => {
      // This tests the private method indirectly through findById
      const mockUserRow = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: '1234567890',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        extraField: 'should be ignored', // Extra fields should be ignored
      };

      mockDb.select.mockReturnValue(builder([mockUserRow]));

      return userRepository.findById(1).then(result => {
        expect(result).toEqual({
          userId: 1,
          firstName: 'Jason',
          lastName: 'Mayo',
          email: 'jason@example.com',
          phone: '1234567890',
          passwordHash: 'hashed_password',
          // Note: createdAt, updatedAt, and extraField are not included
        });
      });
    });

    it('should handle null phone field correctly', () => {
      const mockUserRow = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: null,
        passwordHash: 'hashed_password',
      };

      mockDb.select.mockReturnValue(builder([mockUserRow]));

      return userRepository.findById(1).then(result => {
        expect(result?.phone).toBeUndefined();
      });
    });

    it('should handle null passwordHash field correctly', () => {
      const mockUserRow = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        phone: '1234567890',
        passwordHash: null,
      };

      mockDb.select.mockReturnValue(builder([mockUserRow]));

      return userRepository.findById(1).then(result => {
        expect(result?.passwordHash).toBeUndefined();
      });
    });
  });

  describe('transaction handling', () => {
    it('should use provided transaction executor when available', async () => {

      const mockTx = {
        select: jest.fn().mockReturnValue(builder([])),
        insert: jest.fn().mockReturnValue(builder()),
      };
      const email = 'jared@example.com';


      await userRepository.findByEmail(email, mockTx);


      expect(mockTx.select).toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled(); // Should use tx, not global db
    });

    it('should use global db when no transaction provided', async () => {

      const email = 'jared@example.com';
      mockDb.select.mockReturnValue(builder([]));


      await userRepository.findByEmail(email);


      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle empty email string', async () => {

      const email = '';
      mockDb.select.mockReturnValue(builder([]));


      const result = await userRepository.findByEmail(email);


      expect(result).toBeNull();
    });

    it('should handle negative user ID', async () => {

      const userId = -1;
      mockDb.select.mockReturnValue(builder([]));


      const result = await userRepository.findById(userId);


      expect(result).toBeNull();
    });

    it('should handle zero user ID', async () => {

      const userId = 0;
      mockDb.select.mockReturnValue(builder([]));


      const result = await userRepository.findById(userId);


      expect(result).toBeNull();
    });

    it('should handle empty roles array in assignRoles', async () => {

      const userId = 1;
      const roles: Array<'member' | 'coach' | 'admin' | 'manager'> = [];
      mockDb.select.mockReturnValue(builder([]));


      await userRepository.assignRoles(userId, roles);


      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
