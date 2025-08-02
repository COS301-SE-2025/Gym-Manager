import axios from 'axios';

export const userManagementService = {
  async updateStatus(userId: number, status: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    await axios.patch(
      `http://localhost:4000/users/updateUserById/${userId}`,
      { status, role: 'member' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};
