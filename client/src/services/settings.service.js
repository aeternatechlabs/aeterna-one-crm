import { handleApiCall } from './apiErrorHandler';

export const settingsService = {
  /**
   * Fetch Brevo and Cloudflare R2 integration statuses and document metrics
   */
  getIntegrations: async () => {
    return handleApiCall('get', '/settings/integrations');
  },

  /**
   * Send live test email to verify Brevo transactional dispatch
   * @param {string} testEmail
   */
  testEmail: async (testEmail) => {
    return handleApiCall('post', '/settings/test-email', { testEmail });
  },

  /**
   * Test Cloudflare R2 read/write/delete permissions and latency
   */
  testStorage: async () => {
    return handleApiCall('post', '/settings/test-storage');
  },
};
