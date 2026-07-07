import axios, { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Default Content-Type: application/json breaks FormData; let the runtime set multipart + boundary.
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
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    }

    // Handle HTTP errors
    const status = error.response.status;
    const data = error.response.data as any;

    switch (status) {
      case 401:
        // Unauthorized - clear token and redirect to Operations Portal login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth-storage');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject({
          message: 'Unauthorized. Please login again.',
          code: 'UNAUTHORIZED',
          status,
        });

      case 403:
        return Promise.reject({
          message: data?.message || 'Forbidden. You do not have permission to perform this action.',
          code: 'FORBIDDEN',
          status,
        });

      case 404:
        return Promise.reject({
          message: data?.message || 'Resource not found.',
          code: 'NOT_FOUND',
          status,
        });

      case 422:
        // Validation errors
        return Promise.reject({
          message: data?.message || 'Validation error.',
          errors: data?.errors,
          code: 'VALIDATION_ERROR',
          status,
        });

      case 500:
        return Promise.reject({
          message: data?.message || 'Internal server error. Please try again later.',
          code: 'SERVER_ERROR',
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

