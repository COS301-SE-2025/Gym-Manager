import axios from 'axios';
import { User, UserRole } from '@/types/types';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
export const UserRoleService = {
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const response = await axios.get<User[]>(`${apiBaseUrl}/roles/getUsersByRole?role=${role}`);
    return response.data;
  }
};