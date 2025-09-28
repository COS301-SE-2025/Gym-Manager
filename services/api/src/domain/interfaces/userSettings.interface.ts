import {
  UserSettings,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
  UpdateUserSettingsResponse,
} from '../entities/userSettings.entity';

export interface IUserSettingsService {
  getUserSettings(userId: number): Promise<UserSettingsResponse>;
  updateUserSettings(
    userId: number,
    request: UpdateUserSettingsRequest,
  ): Promise<UpdateUserSettingsResponse>;
}

export interface IUserSettingsRepository {
  getMemberSettings(userId: number): Promise<UserSettings | null>;
  updateMemberVisibility(
    userId: number,
    publicVisibility: boolean,
  ): Promise<{ userId: number } | null>;
}
