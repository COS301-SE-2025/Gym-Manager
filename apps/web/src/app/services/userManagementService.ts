import axios from 'axios';

export const userManagementService = {
  async updateDetails(userId: number, details: any, roles: string[]): Promise<void> {
    const token = localStorage.getItem('authToken');
    await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`,
      { ...details, roles },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
  async updateStatus(userId: number, status: string, firstName: string): Promise<void> {
    const token = localStorage.getItem('authToken');
    await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`,
      { status, role: 'member', firstName },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};
