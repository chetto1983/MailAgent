import { apiClient } from '../api-client';

// ===== TYPES =====

export interface GdprStatus {
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  dataProcessingAgreementUrl?: string;
  cookiePolicyUrl?: string;
  dataRetentionDays?: number;
  dataExportEnabled: boolean;
  dataDeleteEnabled: boolean;
  cookieConsentEnabled: boolean;
  lastUpdated?: string;
}

// ===== API CLIENT =====

export const complianceApi = {
  /**
   * Get GDPR compliance status
   * GET /compliance/gdpr/status
   */
  async getGdprStatus(): Promise<GdprStatus> {
    const response = await apiClient.get('/compliance/gdpr/status');
    return response.data;
  },
};
