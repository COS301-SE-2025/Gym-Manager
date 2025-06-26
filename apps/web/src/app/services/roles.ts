import axios from 'axios';
import { User, UserRole, Member, Admin, Coach } from '@/types/types';

export const UserRoleService = {
  async getUsersByRole(role: UserRole) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`http://localhost:4000/roles/getUsersByRole/${role}`, {
        // params: { role },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('API call failed, returning mock data:', error);
    }
  },
  async RolesByUser(userId: number): Promise<UserRole[]> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:4000/roles/getRolesByUserId/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        'http://localhost:4000/roles/assign',
        { userId, role },
        { headers: { Authorization: `Bearer ${token}` } }
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
        case 'admin': endpoint = '/roles/removeAdminRole'; break;
        case 'coach': endpoint = '/roles/removeCoachRole'; break;
        case 'member': endpoint = '/roles/removeMemberRole'; break;
        case 'manager': endpoint = '/roles/removeManagerRole'; break;
        default: throw new Error('Invalid role');
      }

      await axios.post(
        `http://localhost:4000${endpoint}`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Could not remove role:', error);
      throw error;
    }
  },
  async getUserById(userId: number): Promise<User> {
  try {
    const token = localStorage.getItem('authToken');
    const res = await axios.get('http://localhost:4000/users/allUsers', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const users: User[] = res.data;
    console.log(res.data);
    const user = users.find((u) => u.userId === userId);
    if (!user) throw new Error('User not found');
    return user;
  } catch (err) {
    console.error('Failed to get user by ID:', err);
    throw err;
  }
}
};