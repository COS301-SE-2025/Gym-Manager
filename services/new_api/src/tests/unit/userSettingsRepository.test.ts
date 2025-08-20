import { UserSettingsRepository } from '../../repositories/userSettings/userSettingsRepository';
import { db } from '../../db/client';
import { members } from '../../db/schema';

jest.mock('../../db/client', () => ({
  db: {
    select: jest.fn(() => ({ from: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis() })),
    update: jest.fn(() => ({ set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), returning: jest.fn().mockReturnThis() })),
  },
}));

describe('UserSettingsRepository', () => {
  let repository: UserSettingsRepository;

  beforeEach(() => {
    repository = new UserSettingsRepository();
    jest.clearAllMocks();
  });

  describe('getMemberSettings', () => {
    it('should return user settings if found', async () => {
      const mockRow = { userId: 1, status: 'approved', creditsBalance: 10, publicVisibility: true };
      (db.select as jest.Mock).mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [mockRow],
          }),
        }),
      });
      const result = await repository.getMemberSettings(1);
      expect(result).toEqual({
        userId: 1,
        status: 'approved',
        creditsBalance: 10,
        publicVisibility: true,
      });
    });

    it('should return null if not found', async () => {
      (db.select as jest.Mock).mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () => [],
          }),
        }),
      });
      const result = await repository.getMemberSettings(2);
      expect(result).toBeNull();
    });
  });

  describe('updateMemberVisibility', () => {
    it('should return userId if update is successful', async () => {
      const mockUpdated = { userId: 1 };
      (db.update as jest.Mock).mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => [mockUpdated],
          }),
        }),
      });
      const result = await repository.updateMemberVisibility(1, false);
      expect(result).toEqual({ userId: 1 });
    });

    it('should return null if update returns no row', async () => {
      (db.update as jest.Mock).mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () => [],
          }),
        }),
      });
      const result = await repository.updateMemberVisibility(2, true);
      expect(result).toBeNull();
    });
  });
});
