import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getToken, getRefreshToken, storeToken, storeRefreshToken, removeToken, removeRefreshToken } from './authStorage';
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

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const currentToken = await getToken();
            const refreshResponse = await axios.post(`${config.BASE_URL}/refresh`, 
              { refreshToken }, 
              {
                headers: { Authorization: `Bearer ${currentToken || ''}` }
              }
            );

            if (refreshResponse.data?.token) {
              await storeToken(refreshResponse.data.token);
              if (refreshResponse.data?.refreshToken) {
                await storeRefreshToken(refreshResponse.data.refreshToken);
              }

              // Update the original request with new token
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
              
              // Retry the original request
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear tokens and let the app handle the auth failure
            await removeToken();
            await removeRefreshToken();
          }
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
}

// Export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
