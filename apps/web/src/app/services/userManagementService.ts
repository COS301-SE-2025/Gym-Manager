import axios from 'axios';

export const userManagementService = {
  async updateStatus(userId: number, status: string, firstName: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    await axios.patch(
      `http://localhost:4000/users/updateUserById/${userId}`,
      { status, role: 'member', firstName },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};
