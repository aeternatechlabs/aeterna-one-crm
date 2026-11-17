import api from './api';

export const authService = {
  /**
   * Log in user
   * @param {Object} credentials - { email, password }
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new staff user
   * @param {Object} userData - { name, email, password, role, branch, phone }
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Get current authenticated user profile
   * @param {Object} [options] - Axios request config (e.g. { signal })
   */
  async getCurrentUser(options = {}) {
    const response = await api.get('/auth/me', options);
    return response.data;
  },

  /**
   * Log out user
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('aeterna_user');
    }
  },

  /**
   * Refresh session tokens
   */
  async refreshToken() {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  /**
   * Fetch backend system health status
   */
  async checkHealth() {
    const response = await api.get('/health');
    return response.data;
  },
};
