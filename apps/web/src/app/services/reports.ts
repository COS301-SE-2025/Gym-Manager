import axios from 'axios';

export const logService = {
  async getLogs(): Promise<any[]> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/analytics/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      throw error;
    }
  },
};

export const analyticsService = {
  async getSummaryStats(period?: string): Promise<{
    totalBookings: number;
    fillRate: number;
    cancellationRate: number;
    noShowRate: number;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      const params = period ? { period } : {};
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/analytics/summary-stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch summary stats:', error);
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

const getMockFinanceSummary = (period?: string) => {
  // period can influence values; keep simple for now
  return {
    revenue: 'R 125,430',
    mrr: 'R 32,800',
    arpu: 'R 420',
    refunds: 'R 1,240',
  };
};

const getMockRevenueTrend = (period?: string) => {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  return {
    labels,
    datasets: [
      { label: 'Revenue', data: [18000, 19500, 21000, 20500, 22000, 24000, 24500], borderColor: '#d8ff3e' },
      { label: 'Refunds', data: [600, 450, 500, 520, 480, 700, 620], borderColor: '#ef4444' },
    ],
  };
};

const getMockRevenueBreakdown = (period?: string) => {
  const labels = ['Memberships', 'Personal Training', 'Classes', 'Merchandise'];
  return {
    labels,
    datasets: [
      {
        label: 'Revenue Share',
        data: [60, 20, 15, 5],
        backgroundColor: [
          'rgba(216, 255, 62, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
      },
    ],
  };
};

export const reportsService = {
  // getBookings: async () => (await api.get('/reports/bookings')).data,

  // Real API functions
  getLogs: async () => {
    return logService.getLogs();
  },

  getSummaryStats: async (period?: string) => {
    try {
      const stats = await analyticsService.getSummaryStats(period);
      return {
        bookings: stats.totalBookings.toLocaleString(),
        fillRate: stats.fillRate,
        cancellationRate: stats.cancellationRate,
        noShowRate: stats.noShowRate,
      };
    } catch (error) {
      console.error('Failed to fetch summary stats:', error);
      // Fallback to mock data if API fails
      return {
        bookings: '0',
        fillRate: 0,
        cancellationRate: 0,
        noShowRate: 0,
      };
    }
  },

  getOperationsData: (period: string) => {
    return getMockOperations(period);
  },

  getAcquisitionData: (period: string) => {
    return getMockAcquisition(period);
  },

  // Finance
  getFinancialAnalytics: async (): Promise<{
    monthlyRecurringRevenue: { current: number; previous: number; growth: number };
    averageRevenuePerUser: { current: number; previous: number; growth: number };
    lifetimeValue: { average: number; median: number };
    revenueTrends: Array<{ year: number; month: number; revenue: number; growth: number }>;
  }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payments/analytics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    console.log('Financial analytics response:', response.data);
    return response.data;
  },
};
