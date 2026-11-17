const { ApiResponse } = require('../../utils/devilWrapper');
const { isDbConnected } = require('../../config/db');
const { BRANCHES } = require('../../config/constants');

/**
 * Health check controller
 * GET /api/v1/health or GET /health
 */
const getHealth = (req, res) => {
  const dbConnected = isDbConnected();
  const statusCode = dbConnected ? 200 : 503;
  const healthData = {
    status: dbConnected ? 'healthy' : 'unhealthy',
    service: 'aeterna-one-crm-backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'connected' : 'disconnected',
    supportedBranches: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI],
  };

  res.status(statusCode).json(
    new ApiResponse(statusCode, {
      message: dbConnected
        ? 'Aeterna One CRM Backend API is active'
        : 'Aeterna One CRM Backend API is degraded (database disconnected)',
      ...healthData,
    })
  );
};

module.exports = {
  getHealth,
};
