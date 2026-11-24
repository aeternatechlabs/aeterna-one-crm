import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: sanitize headers, attach Bearer token, and prepare payload
api.interceptors.request.use(
  (config) => {
    // Cross-origin token fallback (guarantees auth works on Vercel without 3rd-party cookie blockage)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('aeterna_token') : null;
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {}

    const method = config.method?.toLowerCase();
    if (['get', 'head'].includes(method) || (method === 'delete' && !config.data)) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    } else if (['post', 'put', 'patch'].includes(method)) {
      if (config.data === undefined || config.data === null) {
        config.data = {};
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized & automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/auth/login') &&
      !originalRequest?.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('aeterna_refresh_token') : null;
        const refreshRes = await api.post('/auth/refresh', storedRefreshToken ? { refreshToken: storedRefreshToken } : {});
        const newToken = refreshRes?.data?.token || refreshRes?.token;
        const newRefreshToken = refreshRes?.data?.refreshToken || refreshRes?.refreshToken;
        if (newToken && typeof window !== 'undefined') {
          localStorage.setItem('aeterna_token', newToken);
        }
        if (newRefreshToken && typeof window !== 'undefined') {
          localStorage.setItem('aeterna_refresh_token', newRefreshToken);
        }
        return api(originalRequest);
      } catch (refreshErr) {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          localStorage.removeItem('aeterna_user');
          localStorage.removeItem('aeterna_token');
          localStorage.removeItem('aeterna_refresh_token');
        }
        return Promise.reject(refreshErr);
      }
    }

    if (error.response && error.response.status === 401) {
      // Clear authenticated user cache if session expired or invalid
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('aeterna_user');
        localStorage.removeItem('aeterna_token');
        localStorage.removeItem('aeterna_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
