import axios, { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';

// Separate API client for partner portal (uses different auth token)
export const partnerApiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add partner auth token interceptor
partnerApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('partner_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.delete('Content-Type');
      config.headers = headers;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
partnerApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    }

    const status = error.response.status;
    const data = error.response.data as any;

    switch (status) {
      case 401: {
        const reqUrl = String(error.config?.url ?? '');
        const isPartnerLoginFailure = reqUrl.includes('/partner-auth/login');
        if (!isPartnerLoginFailure) {
          localStorage.removeItem('partner_auth_token');
          const path = window.location.pathname;
          const publicPartnerPaths =
            path === '/partner/login' ||
            path.startsWith('/partner/register') ||
            path.startsWith('/partner/verify-email') ||
            path.startsWith('/partner/resend-verification') ||
            path.startsWith('/partner/forgot-password');
          if (!publicPartnerPaths) {
            window.location.href = '/partner/login';
          }
        }
        return Promise.reject({
          message: data?.message || data?.error || 'Unauthorized. Please login again.',
          code: 'UNAUTHORIZED',
          status,
        });
      }

      case 403:
        return Promise.reject({
          message: data?.message || 'Forbidden. You do not have permission.',
          code: 'FORBIDDEN',
          status,
        });

      default:
        return Promise.reject({
          message: data?.message || error.message || 'An error occurred.',
          code: 'UNKNOWN_ERROR',
          status,
        });
    }
  }
);









