import { UserSettingsService } from '../../../services/userSettings/userSettingsService';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getMemberSettings: jest.fn(),
      updateMemberVisibility: jest.fn(),
    };
    service = new UserSettingsService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('should return user settings successfully', async () => {
      const userId = 1;
      const mockMember = {
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        publicVisibility: true,
      };

      mockRepository.getMemberSettings.mockResolvedValue(mockMember);

      const result = await service.getUserSettings(userId);

      expect(mockRepository.getMemberSettings).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        success: true,
        settings: {
          publicVisibility: true,
        },
      });
    });

    it('should throw error if member not found', async () => {
      const userId = 1;
      mockRepository.getMemberSettings.mockResolvedValue(null);

      await expect(
        service.getUserSettings(userId)
      ).rejects.toThrow('Member not found');
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings successfully', async () => {
      const userId = 1;
      const request = {
        publicVisibility: false,
      };
      const mockUpdatedMember = {
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        publicVisibility: false,
      };

      mockRepository.updateMemberVisibility.mockResolvedValue(mockUpdatedMember);

      const result = await service.updateUserSettings(userId, request);

      expect(mockRepository.updateMemberVisibility).toHaveBeenCalledWith(userId, false);
      expect(result).toEqual({
        success: true,
        userId: 1,
        publicVisibility: false,
      });
    });

    it('should throw error if publicVisibility is not a boolean', async () => {
      const userId = 1;
      const request = {
        publicVisibility: 'true' as any,
      };

      await expect(
        service.updateUserSettings(userId, request)
      ).rejects.toThrow("'publicVisibility' must be a boolean");
    });

    it('should throw error if member not found during update', async () => {
      const userId = 1;
      const request = {
        publicVisibility: true,
      };

      mockRepository.updateMemberVisibility.mockResolvedValue(null);

      await expect(
        service.updateUserSettings(userId, request)
      ).rejects.toThrow('Member not found');
    });

    it('should handle undefined publicVisibility', async () => {
      const userId = 1;
      const request = {
        publicVisibility: undefined as any,
      };

      await expect(
        service.updateUserSettings(userId, request)
      ).rejects.toThrow("'publicVisibility' must be a boolean");
    });

    it('should handle null publicVisibility', async () => {
      const userId = 1;
      const request = {
        publicVisibility: null as any,
      };

      await expect(
        service.updateUserSettings(userId, request)
      ).rejects.toThrow("'publicVisibility' must be a boolean");
    });
  });
});
