import { UserSettingsRepository } from '../../repositories/userSettings/userSettingsRepository';
import { db } from '../../db/client';
import { members } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Mock the dependencies
jest.mock('../../db/client', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../db/schema', () => ({
  members: {
    userId: 'mock_userId',
    status: 'mock_status',
    creditsBalance: 'mock_creditsBalance',
    publicVisibility: 'mock_publicVisibility',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

describe('UserSettingsRepository', () => {
  let repository: UserSettingsRepository;

  beforeEach(() => {
    repository = new UserSettingsRepository();
    jest.clearAllMocks();
  });

  describe('getMemberSettings', () => {
    it('should return user settings if found', async () => {
      const mockRow = { 
        userId: 1, 
        status: 'approved', 
        creditsBalance: 10, 
        publicVisibility: true 
      };

      // Mock the complete chain
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockRow])
      };
      
      (db.select as jest.Mock).mockReturnValue(mockSelectChain);
      (eq as jest.Mock).mockReturnValue('mock_condition');

      const result = await repository.getMemberSettings(1);
      
      expect(db.select).toHaveBeenCalledWith({
        userId: members.userId,
        status: members.status,
        creditsBalance: members.creditsBalance,
        publicVisibility: members.publicVisibility,
      });
      expect(mockSelectChain.from).toHaveBeenCalledWith(members);
      expect(mockSelectChain.where).toHaveBeenCalledWith('mock_condition');
      expect(mockSelectChain.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRow);
    });

    it('should return null if not found', async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      
      (db.select as jest.Mock).mockReturnValue(mockSelectChain);
      (eq as jest.Mock).mockReturnValue('mock_condition');

      const result = await repository.getMemberSettings(2);
      expect(result).toBeNull();
    });
  });

  describe('updateMemberVisibility', () => {
    it('should return userId if update is successful', async () => {
      const mockUpdated = { userId: 1 };
      
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUpdated])
      };
      
      (db.update as jest.Mock).mockReturnValue(mockUpdateChain);
      (eq as jest.Mock).mockReturnValue('mock_condition');

      const result = await repository.updateMemberVisibility(1, false);
      
      expect(db.update).toHaveBeenCalledWith(members);
      expect(mockUpdateChain.set).toHaveBeenCalledWith({ publicVisibility: false });
      expect(mockUpdateChain.where).toHaveBeenCalledWith('mock_condition');
      expect(mockUpdateChain.returning).toHaveBeenCalledWith({ userId: members.userId });
      expect(result).toEqual({ userId: 1 });
    });

    it('should return null if update returns no row', async () => {
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([])
      };
      
      (db.update as jest.Mock).mockReturnValue(mockUpdateChain);
      (eq as jest.Mock).mockReturnValue('mock_condition');

      const result = await repository.updateMemberVisibility(2, true);
      expect(result).toBeNull();
    });
  });
});