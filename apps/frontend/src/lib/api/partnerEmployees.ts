import { partnerApiClient } from './partnerClient';

export interface Employee {
  accountId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface InviteEmployeeData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
}

export interface UpdateEmployeeData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: 'active' | 'suspended' | 'inactive';
}

export const partnerEmployeesApi = {
  getEmployees: async (): Promise<{ employees: Employee[] }> => {
    const response = await partnerApiClient.get('/partner-employees');
    return response.data;
  },

  inviteEmployee: async (data: InviteEmployeeData) => {
    const response = await partnerApiClient.post('/partner-employees/invite', data);
    return response.data;
  },

  getEmployee: async (accountId: string): Promise<Employee> => {
    const response = await partnerApiClient.get(`/partner-employees/${accountId}`);
    return response.data;
  },

  updateEmployee: async (accountId: string, data: UpdateEmployeeData): Promise<Employee> => {
    const response = await partnerApiClient.put(`/partner-employees/${accountId}`, data);
    return response.data;
  },

  resendInvitation: async (accountId: string) => {
    const response = await partnerApiClient.post(`/partner-employees/${accountId}/resend-invitation`);
    return response.data;
  },

  removeEmployee: async (accountId: string) => {
    const response = await partnerApiClient.delete(`/partner-employees/${accountId}`);
    return response.data;
  },
};









