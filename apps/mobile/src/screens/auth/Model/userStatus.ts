import axios from 'axios';
import { getToken } from '../../../utils/authStorage';
import config from '../../../config';

export interface UserStatus {
  userId: number;
  roles: string[];
  membershipStatus: string;
}

export const getUserStatus = async (): Promise<UserStatus> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get<UserStatus>(`${config.BASE_URL}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch user status:', error);
    throw error;
  }
};