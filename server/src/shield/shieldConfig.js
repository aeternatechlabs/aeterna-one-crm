/**
 * Aeterna One — API Shield Configuration
 *
 * Configurable rate limits, payload sizes, and security policies
 * Module-specific thresholds prevent abuse without blocking normal staff operations.
 */

const { RATE_LIMIT } = require('../config/constants');

const SHIELD_CONFIG = {
  RATE_LIMITS: {
    // Global fallback policy across all /api routes (100 req / 15 min baseline)
    GLOBAL: {
      windowMs: Number(process.env.SHIELD_GLOBAL_WINDOW_MS) || RATE_LIMIT.WINDOW_MS || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_GLOBAL_MAX) || RATE_LIMIT.MAX_REQUESTS || 100,
    },
    // Strict authentication policy (login, super admin setup) to prevent brute-force
    AUTH: {
      windowMs: Number(process.env.SHIELD_AUTH_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_AUTH_MAX) || (process.env.NODE_ENV === 'test' ? 100 : 10),
    },
    // Dedicated Refresh Token policy to prevent token hammering & resource exhaustion (SEC-09)
    REFRESH: {
      windowMs: Number(process.env.SHIELD_REFRESH_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_REFRESH_MAX) || (process.env.NODE_ENV === 'test' ? 100 : 20),
    },
    // Staff user directory operations
    USERS: {
      windowMs: Number(process.env.SHIELD_USERS_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_USERS_MAX) || 100,
    },
    // High-frequency CRM pipeline student lifecycle operations
    PIPELINE: {
      windowMs: Number(process.env.SHIELD_PIPELINE_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_PIPELINE_MAX) || 120,
    },
    // Heavy report aggregations
    REPORTS: {
      windowMs: Number(process.env.SHIELD_REPORTS_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_REPORTS_MAX) || 30,
    },
    // File upload endpoints
    UPLOADS: {
      windowMs: Number(process.env.SHIELD_UPLOADS_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.SHIELD_UPLOADS_MAX) || 20,
    },
  },

  PAYLOAD: {
    // Normal JSON body limit (1MB default instead of unsafe 10MB)
    JSON_LIMIT: process.env.SHIELD_JSON_LIMIT || '1mb',
    // URL-encoded body limit
    URLENCODED_LIMIT: process.env.SHIELD_URLENCODED_LIMIT || '1mb',
    // File upload limit
    FILE_LIMIT: process.env.SHIELD_FILE_LIMIT || '10mb',
  },

  // Supported content types for mutation requests (POST, PUT, PATCH)
  ALLOWED_CONTENT_TYPES: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ],
};

module.exports = SHIELD_CONFIG;

/**
 * Returns configuration metadata for rate limiting infrastructure.
 * In-memory standalone deployment with zero Redis dependencies.
 */
module.exports.getRateLimitStoreConfig = function getRateLimitStoreConfig() {
  return {
    storeType: 'memory',
    isDistributed: false,
    redisConfigured: false,
    requireDistributed: false,
  };
};
