import { apiClient } from '../utils/apiClient';

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
}

export interface MfaEnableResponse {
  backupCodes: string[];
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordChangeResponse {
  message: string;
}

class MfaPasswordService {
  /**
   * Generate MFA secret and QR code for setup
   */
  async generateMfaSecret(): Promise<MfaSetupResponse> {
    try {
      const response = await apiClient.post('/auth/mfa/generate-secret');
      return response.data;
    } catch (error) {
      console.error('Failed to generate MFA secret:', error);
      throw new Error('Failed to generate MFA secret');
    }
  }

  /**
   * Enable MFA with verification token
   */
  async enableMfa(token: string): Promise<MfaEnableResponse> {
    try {
      const response = await apiClient.post('/auth/mfa/enable', { token });
      return response.data;
    } catch (error) {
      console.error('Failed to enable MFA:', error);
      throw new Error('Failed to enable MFA');
    }
  }

  /**
   * Disable MFA with verification token
   */
  async disableMfa(token: string): Promise<void> {
    try {
      await apiClient.post('/auth/mfa/disable', { token });
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Check MFA status for current user
   */
  async getMfaStatus(): Promise<MfaStatusResponse> {
    try {
      const response = await apiClient.get('/auth/mfa/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get MFA status:', error);
      throw new Error('Failed to get MFA status');
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<PasswordChangeResponse> {
    try {
      const response = await apiClient.post('/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.response?.status === 400) {
        throw new Error('Current password is incorrect');
      }
      throw new Error('Failed to change password');
    }
  }
}

export const mfaPasswordService = new MfaPasswordService();
export default mfaPasswordService;
