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
      await api.post('/auth/logout', {});
    } finally {
      localStorage.removeItem('aeterna_user');
    }
  },

  /**
   * Refresh session tokens
   */
  async refreshToken() {
    const response = await api.post('/auth/refresh', {});
    return response.data;
  },

  /**
   * Fetch backend system health status
   */
  async checkHealth() {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Check or simulate permission check with backend
   * @param {Object} payload - { resource, action, simulatedRole, enforce }
   */
  async checkPermission(payload) {
    const response = await api.post('/auth/check-permission', payload);
    return response.data;
  },

  /**
   * Get full permission matrix from backend
   */
  async getPermissionsMatrix() {
    const response = await api.get('/auth/permissions-matrix');
    return response.data;
  },

  /**
   * Step 1: Request 6-digit password reset OTP
   * @param {string} email
   */
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Step 2: Verify 6-digit password reset OTP
   * @param {string} email
   * @param {string} otp
   */
  async verifyResetOTP(email, otp) {
    const response = await api.post('/auth/verify-reset-otp', { email, otp });
    return response.data;
  },

  /**
   * Step 3: Complete password reset with new password
   * @param {Object} payload - { email, resetToken, newPassword, confirmPassword }
   */
  async resetPassword(payload) {
    const response = await api.post('/auth/reset-password', payload);
    return response.data;
  },
};
