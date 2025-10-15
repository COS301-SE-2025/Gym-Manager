import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getToken, getRefreshToken, storeToken, storeRefreshToken, removeToken, removeRefreshToken, removeUser } from './authStorage';
import config from '../config';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.BASE_URL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token expiry - logout user instead of refreshing
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // If we get 401 or 403, the token has expired - log out the user
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Token expired, logging out user');
          
          // Clear all stored authentication data
          await removeToken();
          await removeRefreshToken();
          await removeUser();
          
          // Note: Navigation to login will be handled by the component that receives this error
          // or by the ResolveAuthScreen which checks for token existence
        }

        return Promise.reject(error);
      }
    );
  }

  // Public methods that mirror axios methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  // Add a method to test API connectivity
  async testConnection() {
    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return response.data;
    } catch (error) {
      console.error('API connection test failed:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
