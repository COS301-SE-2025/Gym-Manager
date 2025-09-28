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
    }
  },

  getGymUtilization: async (weekStartDate?: string) => {
    try {
      return await analyticsService.getGymUtilization(weekStartDate);
    } catch (error) {
      console.error('Failed to fetch gym utilization:', error);
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
    }
  },

  getConversionFunnel: async () => {
    try {
      const funnel = await analyticsService.getConversionFunnel();
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
    }
  },

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
    return response.data;
  },
};
