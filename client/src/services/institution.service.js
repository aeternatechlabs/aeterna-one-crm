import api from './api';

export const institutionService = {
  /**
   * List institutions with pagination, search, and type filtering
   * @param {Object} [params] - { page, limit, search, type, branch, city, partnership_status }
   */
  async getInstitutions(params = {}) {
    const response = await api.get('/institutions', { params });
    return response.data;
  },

  /**
   * Get aggregate counts across schools, colleges, and coaching institutes
   */
  async getInstitutionStats() {
    const response = await api.get('/institutions/stats');
    return response.data;
  },

  /**
   * Get single institution record by ID
   * @param {string} id
   */
  async getInstitution(id) {
    const response = await api.get(`/institutions/${id}`);
    return response.data;
  },

  /**
   * Create new School, College, or Coaching Institute
   * @param {Object} data
   */
  async createInstitution(data) {
    const response = await api.post('/institutions', data);
    return response.data;
  },

  /**
   * Update institution details
   * @param {string} id
   * @param {Object} data
   */
  async updateInstitution(id, data) {
    const response = await api.put(`/institutions/${id}`, data);
    return response.data;
  },

  /**
   * Soft-delete institution record
   * @param {string} id
   */
  async deleteInstitution(id) {
    const response = await api.delete(`/institutions/${id}`);
    return response.data;
  },
};
