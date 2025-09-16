import axios from 'axios';

export const logService = {
  async getLogs(): Promise<any[]> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      throw error;
    }
  },
};
// MOCK DATA GENERATORS
const getMockOperations = (period: string) => {
  if (period === 'daily') {
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        { label: 'Capacity', data: [100, 100, 100, 100, 100, 120, 120], borderColor: '#4b5563' },
        { label: 'Bookings', data: [80, 85, 90, 88, 92, 110, 105], borderColor: '#3b82f6' },
        { label: 'Attendance', data: [75, 82, 88, 85, 90, 100, 98], borderColor: '#22c55e' },
        { label: 'Cancellations', data: [5, 3, 2, 3, 2, 10, 7], borderColor: '#f97316' },
        { label: 'No-Shows', data: [2, 1, 0, 1, 1, 5, 4], borderColor: '#ef4444' },
      ],
    };
  }
  // weekly
  return {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      { label: 'Capacity', data: [740, 740, 740, 740], borderColor: '#4b5563' },
      { label: 'Bookings', data: [650, 680, 670, 700], borderColor: '#3b82f6' },
      { label: 'Attendance', data: [620, 650, 640, 680], borderColor: '#22c55e' },
      { label: 'Cancellations', data: [30, 30, 30, 20], borderColor: '#f97316' },
      { label: 'No-Shows', data: [10, 12, 8, 9], borderColor: '#ef4444' },
    ],
  };
};

const getMockAcquisition = (period: string) => {
  if (period === 'monthly') {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        { label: 'Signups', data: [50, 60, 80, 75, 90, 110], borderColor: '#3b82f6' },
        { label: 'Approvals', data: [45, 55, 78, 70, 85, 105], borderColor: '#22c55e' },
      ],
    };
  }
  // weekly
  return {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    datasets: [
      { label: 'Signups', data: [12, 15, 20, 18, 22, 25], borderColor: '#3b82f6' },
      { label: 'Approvals', data: [11, 14, 20, 17, 21, 24], borderColor: '#22c55e' },
    ],
  };
};

export const reportsService = {
  // getBookings: async () => (await api.get('/reports/bookings')).data,

  // NEW MOCKED FUNCTIONS
  getSummaryStats: async () => {
    return new Promise((resolve) =>
      // eslint-disable-next-line no-undef
      setTimeout(
        () =>
          resolve({
            bookings: '1,284',
            fillRate: 0.88,
            cancellationRate: 0.04,
            noShowRate: 0.02,
          }),
        500,
      )
    );
  },

  getOperationsData: (period: string) => {
    return getMockOperations(period);
  },

  getAcquisitionData: (period: string) => {
    return getMockAcquisition(period);
  },
};
