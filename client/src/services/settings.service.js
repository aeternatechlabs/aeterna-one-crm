import { handleApiCall } from './apiErrorHandler';

export const settingsService = {
  getIntegrations: async () => {
    return handleApiCall('get', '/settings/integrations');
  },

  testEmail: async (testEmail) => {
    return handleApiCall('post', '/settings/test-email', { testEmail });
  },

  testStorage: async () => {
    return handleApiCall('post', '/settings/test-storage');
  },

  connectResend: async (data) => {
    return handleApiCall('post', '/settings/resend/connect', data);
  },

  disconnectResend: async () => {
    return handleApiCall('post', '/settings/resend/disconnect');
  },
};
