import axios from 'axios';
import { User, UserRole, Member, Admin, Coach } from '@/types/types';

export const UserRoleService = {
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const response = await axios.get(`http://localhost:4000/roles/getUsersByRole/${role}`);
      return response.data;
    } catch (error) {
      console.error('API call failed, returning mock data:', error);
      return this.getMockUsers(role);
    }
  },

  getMockUsers(role: UserRole): User[] {
    const mockBase = {
      email: 'test@example.com',
      phone: '123-456-7890'
    };

    switch (role) {
      case 'member':
        return [
          {
            user_id: 1,
            name: 'Test Member',
            ...mockBase,
            status: 'active',
            credits_balance: 100
          },
          {
            user_id: 2,
            name: 'Inactive Member',
            ...mockBase,
            status: 'inactive',
            credits_balance: 0
          }
        ] as Member[];

      case 'coach':
        return [
          {
            user_id: 3,
            name: 'Test Coach',
            ...mockBase,
            bio: 'Certified fitness trainer with 5 years experience'
          },
          {
            user_id: 4,
            name: 'New Coach',
            ...mockBase,
            bio: 'Specializing in yoga and mindfulness'
          }
        ] as Coach[];

      case 'admin':
        return [
          {
            user_id: 5,
            name: 'Admin User',
            ...mockBase,
            authorisation: 'super'
          },
          {
            user_id: 6,
            name: 'Support Admin',
            ...mockBase,
            authorisation: 'basic'
          }
        ] as Admin[];

      default:
        return [];
    }
  }
};