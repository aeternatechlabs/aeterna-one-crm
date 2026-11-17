import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

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
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshErr) {
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('aeterna_user');
        }
        return Promise.reject(refreshErr);
      }
    }

    if (error.response && error.response.status === 401) {
      // Clear authenticated user cache if session expired or invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('aeterna_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
