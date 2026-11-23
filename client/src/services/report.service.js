import { handleApiCall } from './apiErrorHandler';

export const reportService = {
  getOverview: async (params = {}) => {
    return handleApiCall('get', '/reports/overview', params);
  },

  getBranchScorecards: async (params = {}) => {
    return handleApiCall('get', '/reports/branch-scorecards', params);
  },

  getFunnel: async (params = {}) => {
    return handleApiCall('get', '/reports/funnel', params);
  },

  getCounsellorPerformance: async (params = {}) => {
    return handleApiCall('get', '/reports/counsellor-performance', params);
  },

  getIntakeTrends: async (params = {}) => {
    return handleApiCall('get', '/reports/intake-trends', params);
  },
};
