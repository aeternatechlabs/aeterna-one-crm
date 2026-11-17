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
};
