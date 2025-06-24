import axios from 'axios';
import { User, UserRole } from '@/types/types';

export const UserRoleService = {
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const response = await axios.get<User[]>(`roles/getUsersByRole?role=${role}`);
    return response.data;
  }
};