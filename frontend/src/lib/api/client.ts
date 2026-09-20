import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { APIError, TokenPair } from '@/types/api';
import { parseApiError, toApiError, ErrorContext } from './error-handler';

import { env, getApiBaseUrl } from '@/lib/config';

export { getApiBaseUrl };

// In-memory token storage reference for client interceptors
let accessToken: string | null = null;
let sessionKey: string | null = null;

// Concurrency-safe token refresh lock
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Access token setter for auth store integration
 */
export const setApiAccessToken = (token: string | null) => {
  accessToken = token;
};

/**
 * Session key setter for guest cart operations
 */
export const setApiSessionKey = (key: string | null) => {
  sessionKey = key;
};

/**
 * Generate lightweight UUID for X-Request-ID header
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
}

/**
 * Normalizes any error into a standard APIError structure
 */
export function normalizeApiError(error: unknown, context: ErrorContext = 'generic'): APIError {
  const parsed = parseApiError(error, context);
  return toApiError(parsed);
}

export const apiClient: AxiosInstance = axios.create({
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth, Dynamic BaseURL & Correlation Headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const base = getApiBaseUrl();
    if (config.url && !config.url.startsWith('http')) {
      const cleanPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `${base}${cleanPath}`;
    }

    // Attach Access Token if available
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Attach X-Request-ID for distributed tracing
    if (!config.headers['X-Request-ID']) {
      config.headers['X-Request-ID'] = generateRequestId();
    }

    // Attach Session Key if available (for guest cart operations)
    const activeSessionKey = sessionKey || (typeof window !== 'undefined' ? localStorage.getItem('pdx_session_key') : null);
    if (activeSessionKey && !config.headers['X-Session-Key']) {
      config.headers['X-Session-Key'] = activeSessionKey;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Concurrency-Safe JWT Refresh Lock
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and request hasn't been retried yet and is not the refresh/login endpoint itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/users/login/')
    ) {
      if (isRefreshing) {
        // Queue parallel requests until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Retrieve refresh token from secure store callback / storage
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('pdx_refresh_token') : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await axios.post<TokenPair>(
          `${getApiBaseUrl()}/users/login/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = refreshResponse.data.access;
        setApiAccessToken(newAccessToken);

        // Update stored refresh token if rotated
        if (refreshResponse.data.refresh && typeof window !== 'undefined') {
          localStorage.setItem('pdx_refresh_token', refreshResponse.data.refresh);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setApiAccessToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pdx_refresh_token');
          window.dispatchEvent(new CustomEvent('pdx:auth-expired'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
