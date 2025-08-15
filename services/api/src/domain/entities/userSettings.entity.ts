export interface UserSettings {
  userId: number;
  publicVisibility: boolean;
}

export interface UpdateUserSettingsRequest {
  publicVisibility: boolean;
}

export interface UserSettingsResponse {
  success: boolean;
  settings: {
    publicVisibility: boolean;
  };
}

export interface UpdateUserSettingsResponse {
  success: boolean;
  userId: number;
  publicVisibility: boolean;
}
