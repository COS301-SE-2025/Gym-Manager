import axios from 'axios';
import { getToken } from '../utils/authStorage';

const API_BASE_URL = 'http://localhost:4000';

export interface UserSettings {
  publicVisibility: boolean;
}

export interface UserSettingsResponse {
  success: boolean;
  settings: UserSettings;
}

export interface UpdateVisibilityResponse {
  success: boolean;
  userId: number;
  publicVisibility: boolean;
}

/**
 * Fetch the current user's settings
 */
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get<UserSettingsResponse>(`${API_BASE_URL}/user/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch user settings');
    }

    return response.data.settings;
  } catch (error) {
    console.error('Failed to fetch user settings:', error);
    throw error;
  }
};

/**
 * Update the user's leaderboard visibility setting
 */
export const updateUserVisibility = async (isPublic: boolean): Promise<void> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post<UpdateVisibilityResponse>(
      `${API_BASE_URL}/user/settings/visibility`,
      {
        publicVisibility: isPublic,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.data.success) {
      throw new Error('Failed to update visibility setting');
    }
  } catch (error) {
    console.error('Failed to update user visibility:', error);
    throw error;
  }
};
