import axios from 'axios';
import {
  clearSession,
  getRefreshToken,
  getToken,
  saveAccessToken,
  saveRefreshToken
} from './secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.17:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let pendingRequests = [];

const isAuthPath = (url = '') => {
  const normalized = String(url).toLowerCase();
  return (
    normalized.includes('/login') ||
    normalized.includes('/register') ||
    normalized.includes('/refresh')
  );
};

const flushPendingRequests = (error, token = null) => {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(token);
  });

  pendingRequests = [];
};

api.interceptors.request.use(
  async (config) => {
    if (!isAuthPath(config.url)) {
      const token = await getToken();
      if (token) {
        config.headers = config.headers || {};
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (isAuthPath(originalRequest.url) || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const refreshResponse = await refreshClient.post('/refresh', { refreshToken });
      const newAccessToken = refreshResponse.data?.token || refreshResponse.data?.accessToken;
      const newRefreshToken = refreshResponse.data?.refreshToken;

      if (!newAccessToken) {
        throw new Error('Refresh endpoint did not return a token');
      }

      await saveAccessToken(newAccessToken);
      if (newRefreshToken) {
        await saveRefreshToken(newRefreshToken);
      }

      flushPendingRequests(null, newAccessToken);
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      flushPendingRequests(refreshError, null);
      await clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
