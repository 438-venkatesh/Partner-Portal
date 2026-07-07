import { partnerApiClient } from './partnerClient';

export interface PartnerRegisterData {
  partnerName: string;
  displayName?: string;
  partnerType: 'agency' | 'reseller' | 'integrator' | 'consultant' | 'affiliate' | 'supplier' | 'logistics_partner' | 'supplier_logistics';
  businessType?: 'b2b' | 'b2c' | 'both';
  website?: string;
  description?: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface PartnerRegisterResponse {
  message: string;
  partnerId: string;
  accountId: string;
  emailVerificationToken?: string;
  devEmailVerificationUrl?: string;
}

export interface ResendVerificationResponse {
  message: string;
  emailVerificationToken?: string;
  devEmailVerificationUrl?: string;
}

export interface PartnerLoginData {
  email: string;
  password: string;
}

export interface PartnerUser {
  accountId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  partnerId: string;
  partnerName: string;
  partnerType?: string;
  partnerStatus: string;
  /** From JWT / login response — admin | manager | member | viewer */
  role?: string;
}

export interface PartnerOrganization {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerType?: string;
  displayName: string | null;
  website: string | null;
  description: string | null;
}

export interface PartnerAuthResponse {
  token: string;
  user: PartnerUser;
}

export const partnerAuthApi = {
  register: async (data: PartnerRegisterData): Promise<PartnerRegisterResponse> => {
    const response = await partnerApiClient.post<PartnerRegisterResponse>('/partner-auth/register', data);
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await partnerApiClient.get(`/partner-auth/verify-email/${token}`);
    return response.data;
  },

  resendVerification: async (email: string): Promise<ResendVerificationResponse> => {
    const response = await partnerApiClient.post<ResendVerificationResponse>('/partner-auth/resendVerification', {
      email,
    });
    return response.data;
  },

  login: async (data: PartnerLoginData): Promise<PartnerAuthResponse> => {
    const response = await partnerApiClient.post<PartnerAuthResponse>('/partner-auth/login', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<PartnerUser> => {
    const response = await partnerApiClient.get<PartnerUser>('/partner-auth/me');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await partnerApiClient.post('/partner-auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await partnerApiClient.post('/partner-auth/reset-password', { token, password });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await partnerApiClient.post('/partner-auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  getOrganization: async (): Promise<{ organization: PartnerOrganization }> => {
    const response = await partnerApiClient.get('/partner-auth/organization');
    return response.data;
  },

  updateOrganization: async (data: {
    displayName?: string;
    website?: string;
    description?: string;
  }): Promise<{ organization: PartnerOrganization }> => {
    const response = await partnerApiClient.put('/partner-auth/organization', data);
    return response.data;
  },
};

