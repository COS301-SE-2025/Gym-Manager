import { MemberRepository } from '../../../repositories/member/memberRepository';
import { builder } from '../../builder';
import { members, users } from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('MemberRepository', () => {
  let memberRepository: MemberRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    memberRepository = new MemberRepository();
  });

  describe('getCreditsBalance', () => {
    it('should return credits balance for existing member', async () => {
      const userId = 1;
      const mockMember = { creditsBalance: 15 };

      mockDb.select.mockReturnValue(builder([mockMember]));

      const result = await memberRepository.getCreditsBalance(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(15);
    });

    it('should throw error when member not found', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      await expect(memberRepository.getCreditsBalance(userId)).rejects.toThrow('Member not found');

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle zero credits balance', async () => {
      const userId = 2;
      const mockMember = { creditsBalance: 0 };

      mockDb.select.mockReturnValue(builder([mockMember]));

      const result = await memberRepository.getCreditsBalance(userId);

      expect(result).toBe(0);
    });

    it('should handle high credits balance', async () => {
      const userId = 3;
      const mockMember = { creditsBalance: 1000 };

      mockDb.select.mockReturnValue(builder([mockMember]));

      const result = await memberRepository.getCreditsBalance(userId);

      expect(result).toBe(1000);
    });
  });

  describe('memberExists', () => {
    it('should return true when member exists', async () => {
      const userId = 1;
      const mockMember = { userId: 1 };

      mockDb.select.mockReturnValue(builder([mockMember]));

      const result = await memberRepository.memberExists(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when member does not exist', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await memberRepository.memberExists(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle multiple query results correctly', async () => {
      const userId = 1;
      const mockMembers = [{ userId: 1 }, { userId: 1 }];

      mockDb.select.mockReturnValue(builder(mockMembers));

      const result = await memberRepository.memberExists(userId);

      expect(result).toBe(true);
    });
  });

  describe('addCredits', () => {
    it('should add credits to existing member balance', async () => {
      const userId = 1;
      const creditsToAdd = 5;
      const currentBalance = 10;
      const expectedNewBalance = 15;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.addCredits(userId, creditsToAdd);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBe(expectedNewBalance);
    });

    it('should add credits to zero balance', async () => {
      const userId = 2;
      const creditsToAdd = 10;
      const currentBalance = 0;
      const expectedNewBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.addCredits(userId, creditsToAdd);

      expect(result).toBe(expectedNewBalance);
    });

    it('should handle adding large number of credits', async () => {
      const userId = 3;
      const creditsToAdd = 100;
      const currentBalance = 50;
      const expectedNewBalance = 150;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.addCredits(userId, creditsToAdd);

      expect(result).toBe(expectedNewBalance);
    });

    it('should throw error when member not found', async () => {
      const userId = 999;
      const creditsToAdd = 5;

      mockDb.select.mockReturnValue(builder([]));

      await expect(memberRepository.addCredits(userId, creditsToAdd)).rejects.toThrow('Member not found');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should work with transaction executor', async () => {
      const userId = 1;
      const creditsToAdd = 5;
      const currentBalance = 10;
      const mockTx = {
        select: jest.fn().mockReturnValue(builder([{ creditsBalance: currentBalance }])),
        update: jest.fn().mockReturnValue(builder()),
      };

      const result = await memberRepository.addCredits(userId, creditsToAdd, mockTx);

      expect(mockTx.select).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toBe(15);
    });

    it('should handle adding zero credits', async () => {
      const userId = 1;
      const creditsToAdd = 0;
      const currentBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.addCredits(userId, creditsToAdd);

      expect(result).toBe(currentBalance);
    });

    it('should handle floating point credits addition', async () => {
      const userId = 1;
      const creditsToAdd = 2.5;
      const currentBalance = 7.5;
      const expectedNewBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.addCredits(userId, creditsToAdd);

      expect(result).toBe(expectedNewBalance);
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits from member balance', async () => {
      const userId = 1;
      const creditsToDeduct = 5;
      const currentBalance = 15;
      const expectedNewBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.deductCredits(userId, creditsToDeduct);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBe(expectedNewBalance);
    });

    it('should allow deducting all credits to reach zero balance', async () => {
      const userId = 2;
      const creditsToDeduct = 10;
      const currentBalance = 10;
      const expectedNewBalance = 0;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.deductCredits(userId, creditsToDeduct);

      expect(result).toBe(expectedNewBalance);
    });

    it('should throw error when insufficient credits', async () => {
      const userId = 3;
      const creditsToDeduct = 20;
      const currentBalance = 15;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));

      await expect(memberRepository.deductCredits(userId, creditsToDeduct)).rejects.toThrow('Insufficient credits');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error when deducting from zero balance', async () => {
      const userId = 4;
      const creditsToDeduct = 1;
      const currentBalance = 0;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));

      await expect(memberRepository.deductCredits(userId, creditsToDeduct)).rejects.toThrow('Insufficient credits');

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error when member not found', async () => {
      const userId = 999;
      const creditsToDeduct = 5;

      mockDb.select.mockReturnValue(builder([]));

      await expect(memberRepository.deductCredits(userId, creditsToDeduct)).rejects.toThrow('Member not found');

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should work with transaction executor', async () => {
      const userId = 1;
      const creditsToDeduct = 3;
      const currentBalance = 10;
      const mockTx = {
        select: jest.fn().mockReturnValue(builder([{ creditsBalance: currentBalance }])),
        update: jest.fn().mockReturnValue(builder()),
      };

      const result = await memberRepository.deductCredits(userId, creditsToDeduct, mockTx);

      expect(mockTx.select).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(result).toBe(7);
    });

    it('should handle deducting zero credits', async () => {
      const userId = 1;
      const creditsToDeduct = 0;
      const currentBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.deductCredits(userId, creditsToDeduct);

      expect(result).toBe(currentBalance);
    });

    it('should handle floating point credits deduction', async () => {
      const userId = 1;
      const creditsToDeduct = 2.5;
      const currentBalance = 10;
      const expectedNewBalance = 7.5;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.deductCredits(userId, creditsToDeduct);

      expect(result).toBe(expectedNewBalance);
    });

    it('should throw error for insufficient credits with floating point', async () => {
      const userId = 1;
      const creditsToDeduct = 10.1;
      const currentBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));

      await expect(memberRepository.deductCredits(userId, creditsToDeduct)).rejects.toThrow('Insufficient credits');
    });
  });

  describe('getMemberProfile', () => {
    it('should return complete member profile', async () => {
      const userId = 1;
      const mockProfile = {
        userId: 1,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason@example.com',
        creditsBalance: 25,
        status: 'approved',
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('should return profile with different member status', async () => {
      const userId = 2;
      const mockProfile = {
        userId: 2,
        firstName: 'Jared',
        lastName: 'Hurlimam',
        email: 'jared@example.com',
        creditsBalance: 12,
        status: 'pending',
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(result.status).toBe('pending');
      expect(result.publicVisibility).toBe(false);
    });

    it('should return profile with zero credits', async () => {
      const userId = 3;
      const mockProfile = {
        userId: 3,
        firstName: 'Vansh',
        lastName: 'Sood',
        email: 'vansh@example.com',
        creditsBalance: 0,
        status: 'approved',
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result.creditsBalance).toBe(0);
    });

    it('should return profile with suspended status', async () => {
      const userId = 4;
      const mockProfile = {
        userId: 4,
        firstName: 'Dennis',
        lastName: 'Woodly',
        email: 'dennis@example.com',
        creditsBalance: 8,
        status: 'suspended',
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result.status).toBe('suspended');
    });

    it('should return profile with cancelled status', async () => {
      const userId = 5;
      const mockProfile = {
        userId: 5,
        firstName: 'Amadeus',
        lastName: 'Test',
        email: 'amadeus@example.com',
        creditsBalance: 3,
        status: 'cancelled',
        publicVisibility: false,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result.status).toBe('cancelled');
    });

    it('should throw error when member not found', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      await expect(memberRepository.getMemberProfile(userId)).rejects.toThrow('Member not found');

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle long email addresses', async () => {
      const userId = 6;
      const mockProfile = {
        userId: 6,
        firstName: 'Jason',
        lastName: 'Mayo',
        email: 'jason.mayo.very.long.email.address@example.com',
        creditsBalance: 15,
        status: 'approved',
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result.email).toBe('jason.mayo.very.long.email.address@example.com');
    });

    it('should handle high credit balances', async () => {
      const userId = 7;
      const mockProfile = {
        userId: 7,
        firstName: 'Jared',
        lastName: 'Hurlimam',
        email: 'jared@example.com',
        creditsBalance: 999,
        status: 'approved',
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result.creditsBalance).toBe(999);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle database connection errors in getCreditsBalance', async () => {
      const userId = 1;
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(memberRepository.getCreditsBalance(userId)).rejects.toThrow('Database connection failed');
    });

    it('should handle database connection errors in memberExists', async () => {
      const userId = 1;
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(memberRepository.memberExists(userId)).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors during credit addition', async () => {
      const userId = 1;
      const creditsToAdd = 5;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: 10 }]));
      mockDb.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      await expect(memberRepository.addCredits(userId, creditsToAdd)).rejects.toThrow('Update failed');
    });

    it('should handle database errors during credit deduction', async () => {
      const userId = 1;
      const creditsToDeduct = 5;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: 10 }]));
      mockDb.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      await expect(memberRepository.deductCredits(userId, creditsToDeduct)).rejects.toThrow('Update failed');
    });

    it('should handle negative credit amounts in addCredits', async () => {
      const userId = 1;
      const creditsToAdd = -5;
      const currentBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.addCredits(userId, creditsToAdd);

      expect(result).toBe(5);
    });

    it('should handle negative credit amounts in deductCredits', async () => {
      const userId = 1;
      const creditsToDeduct = -5;
      const currentBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const result = await memberRepository.deductCredits(userId, creditsToDeduct);

      expect(result).toBe(15);
    });

    it('should handle very large user IDs', async () => {
      const userId = 999999999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await memberRepository.memberExists(userId);

      expect(result).toBe(false);
    });

    it('should handle zero user ID', async () => {
      const userId = 0;
      mockDb.select.mockReturnValue(builder([]));

      const result = await memberRepository.memberExists(userId);

      expect(result).toBe(false);
    });

    it('should handle null values in profile data gracefully', async () => {
      const userId = 1;
      const mockProfile = {
        userId: 1,
        firstName: null,
        lastName: null,
        email: 'test@example.com',
        creditsBalance: 10,
        status: 'approved',
        publicVisibility: true,
      };

      mockDb.select.mockReturnValue(builder([mockProfile]));

      const result = await memberRepository.getMemberProfile(userId);

      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.email).toBe('test@example.com');
    });

    it('should handle transaction rollback scenarios', async () => {
      const userId = 1;
      const creditsToAdd = 5;
      const mockTx = {
        select: jest.fn().mockReturnValue(builder([{ creditsBalance: 10 }])),
        update: jest.fn().mockImplementation(() => {
          throw new Error('Transaction rolled back');
        }),
      };

      await expect(memberRepository.addCredits(userId, creditsToAdd, mockTx)).rejects.toThrow('Transaction rolled back');

      expect(mockTx.select).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('should handle concurrent credit operations', async () => {
      const userId = 1;
      const currentBalance = 10;

      mockDb.select.mockReturnValue(builder([{ creditsBalance: currentBalance }]));
      mockDb.update.mockReturnValue(builder());

      const addPromise = memberRepository.addCredits(userId, 5);
      const deductPromise = memberRepository.deductCredits(userId, 3);

      const [addResult, deductResult] = await Promise.all([addPromise, deductPromise]);

      expect(addResult).toBe(15);
      expect(deductResult).toBe(7);
    });
  });
});
