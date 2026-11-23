import { handleApiCall } from './apiErrorHandler';

export const pipelineService = {
  /**
   * Fetch pipeline students with optional branch, stage, search and fields filter
   */
  getPipeline: async (params = {}) => {
    return handleApiCall('get', '/pipeline', params);
  },

  /**
   * Update student pipeline stage
   * @param {string} id
   * @param {Object} data - { stage, reason, simulateError }
   * @param {Object} [options] - Additional axios/handler options
   */
  updateStudentStage: async (id, data, options = {}) => {
    const headers = {};
    if (data.simulateError) {
      headers['x-simulate-validation-error'] = 'true';
    }

    return handleApiCall('patch', `/pipeline/${id}/stage`, data, {
      showToast: false,
      headers,
      ...options,
    });
  },

  /**
   * Toggle student document verification status
   */
  toggleDocumentVerification: async (id, documentsVerified) => {
    return handleApiCall('patch', `/pipeline/${id}/documents`, { documentsVerified });
  },

  /**
   * Add new student enquiry to pipeline
   */
  createStudent: async (studentData) => {
    return handleApiCall('post', '/pipeline', studentData);
  },

  /**
   * Fetch live dashboard performance summary and ribbon counts
   * @param {Object} params - { branch, period }
   */
  getDashboardSummary: async (params = {}) => {
    return handleApiCall('get', '/pipeline/dashboard-summary', params, { showToast: false });
  },

  /**
   * Live global search across pipeline candidates and student profiles
   * @param {Object} params - { query, branch, limit }
   */
  globalSearch: async (params = {}) => {
    return handleApiCall('get', '/pipeline/global-search', params, { showToast: false });
  },
};
