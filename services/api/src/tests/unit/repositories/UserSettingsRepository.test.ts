import { UserSettingsRepository } from '../../../repositories/userSettings/userSettingsRepository';
import { builder } from '../../builder';
import { members } from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('UserSettingsRepository', () => {
  let userSettingsRepository: UserSettingsRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    userSettingsRepository = new UserSettingsRepository();
  });

  describe('getMemberSettings', () => {
    it('should return user settings when member exists', async () => {
      const userId = 1;
      const mockMemberRow = {
        userId: 1,
        status: 'approved',
        creditsBalance: 15,
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 1,
        publicVisibility: true,
      });
    });

    it('should return settings for member with private visibility', async () => {
      const userId = 2;
      const mockMemberRow = {
        userId: 2,
        status: 'approved',
        creditsBalance: 10,
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 2,
        publicVisibility: false,
      });
    });

    it('should return settings for pending member', async () => {
      const userId = 3;
      const mockMemberRow = {
        userId: 3,
        status: 'pending',
        creditsBalance: 0,
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 3,
        publicVisibility: true,
      });
    });

    it('should return settings for suspended member', async () => {
      const userId = 4;
      const mockMemberRow = {
        userId: 4,
        status: 'suspended',
        creditsBalance: 5,
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 4,
        publicVisibility: false,
      });
    });

    it('should return settings for cancelled member', async () => {
      const userId = 5;
      const mockMemberRow = {
        userId: 5,
        status: 'cancelled',
        creditsBalance: 0,
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 5,
        publicVisibility: false,
      });
    });

    it('should return null when member does not exist', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle zero user ID', async () => {
      const userId = 0;
      mockDb.select.mockReturnValue(builder([]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toBeNull();
    });

    it('should handle negative user ID', async () => {
      const userId = -1;
      mockDb.select.mockReturnValue(builder([]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toBeNull();
    });

    it('should handle very large user ID', async () => {
      const userId = Number.MAX_SAFE_INTEGER;
      mockDb.select.mockReturnValue(builder([]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toBeNull();
    });

    it('should handle member with high credits balance', async () => {
      const userId = 6;
      const mockMemberRow = {
        userId: 6,
        status: 'approved',
        creditsBalance: 1000,
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 6,
        publicVisibility: true,
      });
    });
  });

  describe('updateMemberVisibility', () => {
    it('should update visibility to public and return user ID', async () => {
      const userId = 1;
      const publicVisibility = true;
      const mockUpdated = { userId: 1 };

      mockDb.update.mockReturnValue(builder([mockUpdated]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({ userId: 1 });
    });

    it('should update visibility to private and return user ID', async () => {
      const userId = 2;
      const publicVisibility = false;
      const mockUpdated = { userId: 2 };

      mockDb.update.mockReturnValue(builder([mockUpdated]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual({ userId: 2 });
    });

    it('should return null when member does not exist', async () => {
      const userId = 999;
      const publicVisibility = true;

      mockDb.update.mockReturnValue(builder([]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle updating visibility for different member statuses', async () => {
      const testCases = [
        { userId: 10, status: 'approved' },
        { userId: 11, status: 'pending' },
        { userId: 12, status: 'suspended' },
        { userId: 13, status: 'cancelled' },
      ];

      for (const testCase of testCases) {
        const publicVisibility = true;
        const mockUpdated = { userId: testCase.userId };

        mockDb.update.mockReturnValue(builder([mockUpdated]));

        const result = await userSettingsRepository.updateMemberVisibility(testCase.userId, publicVisibility);

        expect(result).toEqual({ userId: testCase.userId });
      }
    });

    it('should handle zero user ID update', async () => {
      const userId = 0;
      const publicVisibility = false;

      mockDb.update.mockReturnValue(builder([]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(result).toBeNull();
    });

    it('should handle negative user ID update', async () => {
      const userId = -5;
      const publicVisibility = true;

      mockDb.update.mockReturnValue(builder([]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(result).toBeNull();
    });

    it('should handle very large user ID update', async () => {
      const userId = Number.MAX_SAFE_INTEGER;
      const publicVisibility = false;
      const mockUpdated = { userId: Number.MAX_SAFE_INTEGER };

      mockDb.update.mockReturnValue(builder([mockUpdated]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(result).toEqual({ userId: Number.MAX_SAFE_INTEGER });
    });

    it('should handle multiple consecutive visibility updates', async () => {
      const userId = 7;
      const mockUpdated = { userId: 7 };

      mockDb.update.mockReturnValue(builder([mockUpdated]));

      const result1 = await userSettingsRepository.updateMemberVisibility(userId, true);
      const result2 = await userSettingsRepository.updateMemberVisibility(userId, false);
      const result3 = await userSettingsRepository.updateMemberVisibility(userId, true);

      expect(result1).toEqual({ userId: 7 });
      expect(result2).toEqual({ userId: 7 });
      expect(result3).toEqual({ userId: 7 });
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });

    it('should handle same visibility value update', async () => {
      const userId = 8;
      const publicVisibility = true;
      const mockUpdated = { userId: 8 };

      mockDb.update.mockReturnValue(builder([mockUpdated]));

      const result = await userSettingsRepository.updateMemberVisibility(userId, publicVisibility);

      expect(result).toEqual({ userId: 8 });
    });
  });

  describe('mapToUserSettings utility', () => {
    it('should correctly map member row to user settings', async () => {
      const userId = 20;
      const mockMemberRow = {
        userId: 20,
        status: 'approved',
        creditsBalance: 25,
        publicVisibility: true,
        someExtraField: 'should be ignored',
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 20,
        publicVisibility: true,
      });
      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('creditsBalance');
      expect(result).not.toHaveProperty('someExtraField');
    });

    it('should handle null values in member row', async () => {
      const userId = 21;
      const mockMemberRow = {
        userId: 21,
        status: null,
        creditsBalance: null,
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 21,
        publicVisibility: false,
      });
    });

    it('should handle undefined publicVisibility', async () => {
      const userId = 22;
      const mockMemberRow = {
        userId: 22,
        status: 'approved',
        creditsBalance: 10,
        publicVisibility: undefined,
      };

      mockDb.select.mockReturnValue(builder([mockMemberRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 22,
        publicVisibility: undefined,
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle database errors in getMemberSettings', async () => {
      const userId = 1;
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(userSettingsRepository.getMemberSettings(userId)).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors in updateMemberVisibility', async () => {
      const userId = 1;
      const publicVisibility = true;

      mockDb.update.mockImplementation(() => {
        throw new Error('Update operation failed');
      });

      await expect(userSettingsRepository.updateMemberVisibility(userId, publicVisibility)).rejects.toThrow('Update operation failed');
    });

    it('should handle multiple simultaneous get operations', async () => {
      const userIds = [1, 2, 3, 4, 5];
      const mockRows = userIds.map(id => ({
        userId: id,
        status: 'approved',
        creditsBalance: id * 5,
        publicVisibility: id % 2 === 0,
      }));

      mockDb.select.mockImplementation(() => {
        const userId = mockDb.select.mock.calls.length;
        return builder([mockRows[userId - 1]]);
      });

      const promises = userIds.map(id => userSettingsRepository.getMemberSettings(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result?.userId).toBe(userIds[index]);
        expect(result?.publicVisibility).toBe(userIds[index] % 2 === 0);
      });
    });

    it('should handle multiple simultaneous update operations', async () => {
      const userIds = [10, 11, 12];
      const mockUpdated = userIds.map(id => ({ userId: id }));

      mockDb.update.mockImplementation(() => {
        const callIndex = mockDb.update.mock.calls.length - 1;
        return builder([mockUpdated[callIndex]]);
      });

      const promises = userIds.map((id, index) => 
        userSettingsRepository.updateMemberVisibility(id, index % 2 === 0)
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result?.userId).toBe(userIds[index]);
      });
    });

    it('should handle query timeout scenarios', async () => {
      const userId = 1;

      mockDb.select.mockImplementation(() => {
        throw new Error('Query timeout');
      });

      await expect(userSettingsRepository.getMemberSettings(userId)).rejects.toThrow('Query timeout');
    });

    it('should handle update timeout scenarios', async () => {
      const userId = 1;
      const publicVisibility = true;

      mockDb.update.mockImplementation(() => {
        throw new Error('Update timeout');
      });

      await expect(userSettingsRepository.updateMemberVisibility(userId, publicVisibility)).rejects.toThrow('Update timeout');
    });

    it('should handle malformed database responses', async () => {
      const userId = 1;
      mockDb.select.mockReturnValue(builder([null]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toBeNull();
    });

    it('should handle empty object in database response', async () => {
      const userId = 1;
      mockDb.select.mockReturnValue(builder([{}]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: undefined,
        publicVisibility: undefined,
      });
    });

    it('should handle partial data in database response', async () => {
      const userId = 1;
      const mockPartialRow = {
        userId: 1,
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockPartialRow]));

      const result = await userSettingsRepository.getMemberSettings(userId);

      expect(result).toEqual({
        userId: 1,
        publicVisibility: true,
      });
    });

    it('should handle boolean conversion for publicVisibility', async () => {
      const testCases = [
        { input: 1, expected: 1 },
        { input: 0, expected: 0 },
        { input: 'true', expected: 'true' },
        { input: 'false', expected: 'false' },
      ];

      for (const testCase of testCases) {
        const userId = 50;
        const mockMemberRow = {
          userId: 50,
          status: 'approved',
          creditsBalance: 10,
          publicVisibility: testCase.input,
        };

        mockDb.select.mockReturnValue(builder([mockMemberRow]));

        const result = await userSettingsRepository.getMemberSettings(userId);

        expect(result?.publicVisibility).toBe(testCase.expected);
      }
    });
  });
});
