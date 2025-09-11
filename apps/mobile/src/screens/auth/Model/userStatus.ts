import apiClient from '../../../utils/apiClient';

export interface UserStatus {
  userId: number;
  roles: string[];
  membershipStatus: string;
}

export const getUserStatus = async (): Promise<UserStatus> => {
  try {
    const response = await apiClient.get<UserStatus>('/status');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user status:', error);
    throw error;
  }
};