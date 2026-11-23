import { handleApiCall } from './apiErrorHandler';

export const leadService = {
  getLeads: async (params = {}) => {
    return handleApiCall('get', '/leads', null, { params });
  },

  getLeadStats: async () => {
    return handleApiCall('get', '/leads/stats');
  },

  getLead: async (id) => {
    return handleApiCall('get', `/leads/${id}`);
  },

  createLead: async (data) => {
    return handleApiCall('post', '/leads', data);
  },

  updateLead: async (id, data) => {
    return handleApiCall('put', `/leads/${id}`, data);
  },

  updateLeadStatus: async (id, data) => {
    return handleApiCall('patch', `/leads/${id}/status`, data);
  },

  convertToStudent: async (id) => {
    return handleApiCall('post', `/leads/${id}/convert`, {});
  },

  deleteLead: async (id) => {
    return handleApiCall('delete', `/leads/${id}`);
  },
};
