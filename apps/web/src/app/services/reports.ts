import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const logService = {
  async getLogs(): Promise<any[]> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/analytics/logs`, {
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
      const response = await axios.get(`${API_BASE_URL}/analytics/summary-stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch summary stats:', error);
      throw error;
    }
  },

  async getOperationsData(period?: string): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
    }>;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      const params = period ? { period } : {};
      const response = await axios.get(`${API_BASE_URL}/analytics/operations-data`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch operations data:', error);
      throw error;
    }
  },

  async getGymUtilization(weekStartDate?: string): Promise<{
    x_labels: string[];
    y_labels: string[];
    values: number[][];
    averageUtilizationByHour: Array<{
      hour: string;
      averageUtilization: number;
    }>;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      const params = weekStartDate ? { weekStartDate } : {};
      const response = await axios.get(`${API_BASE_URL}/analytics/gym-utilization`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch gym utilization:', error);
      throw error;
    }
  },

  async getAcquisitionData(period?: string): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
    }>;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      const params = period ? { period } : {};
      const response = await axios.get(`${API_BASE_URL}/analytics/acquisition-data`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch acquisition data:', error);
      throw error;
    }
  },

  async getConversionFunnel(): Promise<{
    signups: number;
    approvals: number;
    firstBookings: number;
    attendances: number;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/analytics/conversion-funnel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversion funnel:', error);
      throw error;
    }
  },
};

export const reportsService = {
  // getBookings: async () => (await api.get('/reports/bookings')).data,

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

  getOperationsData: async (period?: string) => {
    try {
      return await analyticsService.getOperationsData(period);
    } catch (error) {
      console.error('Failed to fetch operations data:', error);
      // Fallback to mock data if API fails
      const oldPeriod = period === 'today' ? 'daily' : 
                       period === 'lastWeek' ? 'weekly' : 
                       period === 'lastMonth' ? 'monthly' : 'weekly';
      return getMockOperations(oldPeriod);
    }
  },

  getGymUtilization: async (weekStartDate?: string) => {
    try {
      return await analyticsService.getGymUtilization(weekStartDate);
    } catch (error) {
      console.error('Failed to fetch gym utilization:', error);
      // Fallback to mock data if API fails - generate different patterns based on week
      const weekOffset = weekStartDate ? Math.floor((new Date().getTime() - new Date(weekStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) : 0;
      
      // Generate different patterns for different weeks (17 hours: 6am-10pm)
      const basePattern = [
        [70, 60, 80, 90, 20, 15, 10, 5, 8, 12, 18, 25, 30, 20, 10, 5, 3],   // Sun
        [10, 40, 20, 50, 30, 25, 20, 15, 20, 30, 40, 50, 70, 90, 60, 30, 15],  // Mon
        [15, 45, 25, 55, 35, 30, 25, 20, 25, 35, 45, 55, 75, 95, 65, 35, 20],  // Tue
        [20, 50, 30, 60, 40, 35, 30, 25, 30, 40, 50, 60, 80, 100, 70, 40, 25], // Wed
        [25, 55, 35, 65, 45, 40, 35, 30, 35, 45, 55, 65, 85, 95, 75, 45, 30],  // Thu
        [30, 60, 40, 70, 50, 45, 40, 35, 40, 50, 60, 70, 90, 80, 70, 50, 35],  // Fri
        [80, 70, 90, 100, 60, 50, 40, 30, 35, 40, 50, 60, 40, 30, 20, 10, 5], // Sat
      ];

      // Add variation based on week offset
      const variation = weekOffset * 5; // 5% variation per week
      const values = basePattern.map(day => 
        day.map(hour => Math.round(Math.max(0, Math.min(100, hour + (Math.random() - 0.5) * variation))))
      );

      // Calculate average utilization by hour (17 hours: 6am-10pm)
      const averageUtilizationByHour = [
        { hour: '6am', averageUtilization: Math.round(Math.max(0, 30 + (Math.random() - 0.5) * variation)) },
        { hour: '7am', averageUtilization: Math.round(Math.max(0, 55 + (Math.random() - 0.5) * variation)) },
        { hour: '8am', averageUtilization: Math.round(Math.max(0, 45 + (Math.random() - 0.5) * variation)) },
        { hour: '9am', averageUtilization: Math.round(Math.max(0, 65 + (Math.random() - 0.5) * variation)) },
        { hour: '10am', averageUtilization: Math.round(Math.max(0, 25 + (Math.random() - 0.5) * variation)) },
        { hour: '11am', averageUtilization: Math.round(Math.max(0, 20 + (Math.random() - 0.5) * variation)) },
        { hour: '12pm', averageUtilization: Math.round(Math.max(0, 15 + (Math.random() - 0.5) * variation)) },
        { hour: '1pm', averageUtilization: Math.round(Math.max(0, 10 + (Math.random() - 0.5) * variation)) },
        { hour: '2pm', averageUtilization: Math.round(Math.max(0, 12 + (Math.random() - 0.5) * variation)) },
        { hour: '3pm', averageUtilization: Math.round(Math.max(0, 18 + (Math.random() - 0.5) * variation)) },
        { hour: '4pm', averageUtilization: Math.round(Math.max(0, 25 + (Math.random() - 0.5) * variation)) },
        { hour: '5pm', averageUtilization: Math.round(Math.max(0, 70 + (Math.random() - 0.5) * variation)) },
        { hour: '6pm', averageUtilization: Math.round(Math.max(0, 80 + (Math.random() - 0.5) * variation)) },
        { hour: '7pm', averageUtilization: Math.round(Math.max(0, 60 + (Math.random() - 0.5) * variation)) },
        { hour: '8pm', averageUtilization: Math.round(Math.max(0, 35 + (Math.random() - 0.5) * variation)) },
        { hour: '9pm', averageUtilization: Math.round(Math.max(0, 20 + (Math.random() - 0.5) * variation)) },
        { hour: '10pm', averageUtilization: Math.round(Math.max(0, 10 + (Math.random() - 0.5) * variation)) },
      ];

      return {
        x_labels: ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm'],
        y_labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        values,
        averageUtilizationByHour,
      };
    }
  },

  getBookingTimesAnalytics: async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/analytics/booking-times`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch booking times analytics:', error);
      throw error;
    }
  },

  getAcquisitionData: async (period?: string) => {
    try {
      return await analyticsService.getAcquisitionData(period);
    } catch (error) {
      console.error('Failed to fetch acquisition data:', error);
      // Fallback to mock data if API fails
      const oldPeriod = period === 'today' ? 'daily' : 
                       period === 'lastWeek' ? 'weekly' : 
                       period === 'lastMonth' ? 'monthly' : 'monthly';
      return getMockAcquisition(oldPeriod);
    }
  },

  getConversionFunnel: async () => {
    try {
      const funnel = await analyticsService.getConversionFunnel();
      // Map to chart-friendly format and correct labels per requirement
      return {
        labels: ['Signed Up', 'Approved', 'Booked First Class', 'Attended First Class'],
        datasets: [
          {
            label: 'Users',
            data: [
              funnel.signups,
              funnel.approvals,
              funnel.firstBookings,
              funnel.attendances,
            ],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(216, 255, 62, 0.6)',
            ],
          },
        ],
      };
    } catch (error) {
      console.error('Failed to map conversion funnel:', error);
      // Fallback to empty chart
      return {
        labels: ['Signed Up', 'Approved', 'Booked First Class', 'Attended First Class'],
        datasets: [
          {
            label: 'Users',
            data: [0, 0, 0, 0],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(216, 255, 62, 0.6)',
            ],
          },
        ],
      };
    }
  },

  getCohortRetention: async (period?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const params = period ? { period } : {};
      const response = await axios.get(`${API_BASE_URL}/analytics/cohort-retention`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch cohort retention data:', error);
      // Fallback to mock data if API fails
      return getMockCohortData(period || 'lastWeek');
    }
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
