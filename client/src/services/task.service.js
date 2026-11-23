import { handleApiCall } from './apiErrorHandler';

export const taskService = {
  getTasks: async (params = {}) => {
    return handleApiCall('get', '/tasks', params);
  },

  getDailyQueue: async (params = {}) => {
    return handleApiCall('get', '/tasks/daily-queue', params);
  },

  getTaskById: async (id) => {
    return handleApiCall('get', `/tasks/${id}`);
  },

  createTask: async (taskData) => {
    return handleApiCall('post', '/tasks', taskData);
  },

  updateTask: async (id, updateData) => {
    return handleApiCall('patch', `/tasks/${id}`, updateData);
  },

  logReachout: async (id, reachoutData) => {
    return handleApiCall('post', `/tasks/${id}/reachout-log`, reachoutData);
  },

  completeTask: async (id, completionData) => {
    return handleApiCall('post', `/tasks/${id}/complete`, completionData);
  },

  deleteTask: async (id) => {
    return handleApiCall('delete', `/tasks/${id}`);
  },
};
