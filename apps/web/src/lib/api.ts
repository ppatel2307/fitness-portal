/**
 * API client with axios
 * Handles authentication tokens and request/response interceptors
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';

// In production, use the full API URL; in development, use Vite proxy
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

// Request interceptor - add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        processQueue(error, null);
        // Clear auth state
        setAccessToken(null);
        setRefreshToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${API_URL}/auth/refresh`,
          { refreshToken }
        );

        if (response.data.success && response.data.data) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          setAccessToken(newAccessToken);
          setRefreshToken(newRefreshToken);
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        setRefreshToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper to extract error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiResponse;
    return apiError?.error?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
