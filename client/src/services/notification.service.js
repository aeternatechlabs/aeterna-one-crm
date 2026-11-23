import { handleApiCall } from './apiErrorHandler';

export const notificationService = {
  getNotifications: async (params = {}) => {
    return handleApiCall('get', '/notifications', params);
  },

  markAsRead: async (id) => {
    return handleApiCall('patch', `/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return handleApiCall('post', '/notifications/mark-all-read');
  },
};
