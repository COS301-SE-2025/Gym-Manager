import axios from 'axios';
import { Admin, Coach, Member, User, UserRole } from '@/types/types';
// import { Member, Admin, Coach } from '@/types/types';
export const userRoleService = {
  async getUsersByRole(role: UserRole) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/roles/getUsersByRole/${role}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('API call failed:', error);
    }
  },
  async RolesByUser(userId: number): Promise<UserRole[]> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/roles/getRolesByUserId/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Could not get roles by user:', error);
      throw error;
    }
  },

  async assignRole(userId: number, role: UserRole) {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/roles/assign`,
        { userId, role },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.error('Could not assign role:', error);
      throw error;
    }
  },

  async removeRole(userId: number, role: UserRole) {
    try {
      const token = localStorage.getItem('authToken');
      let endpoint = '';

      switch (role) {
        case 'admin':
          endpoint = '/roles/removeAdminRole';
          break;
        case 'coach':
          endpoint = '/roles/removeCoachRole';
          break;
        case 'member':
          endpoint = '/roles/removeMemberRole';
          break;
        case 'manager':
          endpoint = '/roles/removeManagerRole';
          break;
        default:
          throw new Error('Invalid role');
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.error('Could not remove role:', error);
      throw error;
    }
  },

  async getWeeklySchedule() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/schedule/getWeeklySchedule`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch weekly schedule:', error);
      throw error;
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No auth token found');
      }

      // Decode JWT to get user ID (simple base64 decode of payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/users/getUserById/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },

  async getUserById(userId: number): Promise<User> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/users/getUserById/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const userData = response.data;
      const rolesResponse = await this.RolesByUser(userId);
      const roles: UserRole[] = rolesResponse;
      if (roles.includes('member')) {
        return userData as Member;
      }
      if (roles.includes('coach')) {
        return userData as Coach;
      }
      if (roles.includes('admin')) {
        return userData as Admin;
      }
      return userData as User;
    } catch (err) {
      console.error('Failed to get user by ID:', err);
      throw err;
    }
  },
};
