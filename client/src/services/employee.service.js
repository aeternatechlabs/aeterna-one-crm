import { handleApiCall } from './apiErrorHandler';

export const employeeService = {
  getEmployees: async (params = {}) => {
    return handleApiCall('get', '/employees', params);
  },

  getTrashEmployees: async (params = {}) => {
    return handleApiCall('get', '/employees/trash', params);
  },

  getEmployee: async (id) => {
    return handleApiCall('get', `/employees/${id}`);
  },

  createEmployee: async (employeeData) => {
    return handleApiCall('post', '/employees', employeeData);
  },

  updateEmployee: async (id, employeeData) => {
    return handleApiCall('put', `/employees/${id}`, employeeData);
  },

  toggleStatus: async (id, status) => {
    return handleApiCall('patch', `/employees/${id}/status`, { employment_status: status });
  },

  moveToTrash: async (id, deleteReason = 'Archived by Administrator') => {
    return handleApiCall('delete', `/employees/${id}`, { deleteReason });
  },

  restoreEmployee: async (id) => {
    return handleApiCall('post', `/employees/${id}/restore`, {});
  },

  permanentDelete: async (id) => {
    return handleApiCall('delete', `/employees/${id}/permanent`);
  },
};
