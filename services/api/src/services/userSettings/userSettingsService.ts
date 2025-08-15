import { IUserSettingsService, IUserSettingsRepository } from '../../domain/interfaces/userSettings.interface';
import {
  UserSettingsResponse,
  UpdateUserSettingsRequest,
  UpdateUserSettingsResponse
} from '../../domain/entities/userSettings.entity';
import { UserSettingsRepository } from '../../repositories/userSettings/userSettingsRepository';

/**
 * UserSettingsService - Business Layer
 * Contains all business logic for user settings operations
 */
export class UserSettingsService implements IUserSettingsService {
  private userSettingsRepository: IUserSettingsRepository;

  constructor(userSettingsRepository?: IUserSettingsRepository) {
    this.userSettingsRepository = userSettingsRepository || new UserSettingsRepository();
  }

  async getUserSettings(userId: number): Promise<UserSettingsResponse> {
    const member = await this.userSettingsRepository.getMemberSettings(userId);
    if (!member) {
      throw new Error('Member not found');
    }

    return {
      success: true,
      settings: {
        publicVisibility: member.publicVisibility,
      },
    };
  }

  async updateUserSettings(userId: number, request: UpdateUserSettingsRequest): Promise<UpdateUserSettingsResponse> {
    const { publicVisibility } = request;

    if (typeof publicVisibility !== 'boolean') {
      throw new Error("'publicVisibility' must be a boolean");
    }

    const updated = await this.userSettingsRepository.updateMemberVisibility(userId, publicVisibility);
    if (!updated) {
      throw new Error('Member not found');
    }

    return {
      success: true,
      userId: updated.userId,
      publicVisibility
    };
  }
}
