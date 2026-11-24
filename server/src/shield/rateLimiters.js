/**
 * Aeterna One — API Shield Rate Limiters
 *
 * Module-specific and global rate limiters using express-rate-limit v7 in-memory store.
 * Standardizes 429 responses with retryAfter, request ID tracking, and witty English error notices.
 * Sized appropriately for single-process internal team deployment (~25 users).
 */

const rateLimit = require('express-rate-limit');
const SHIELD_CONFIG = require('./shieldConfig');
const { getErrorMessage, ERROR_CATEGORIES } = require('./errorCatalogue');
const { createSharedRateLimitStore } = require('./redisClient');

/**
 * Factory for creating configured rate limiters with standardized shield 429 responses.
 * Uses shared RedisStore in production clusters (multi-instance) and MemoryStore in local development.
 */
function createShieldLimiter(config, category = ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED, customOptions = {}) {
  const prefix = customOptions.prefix || `rl:${category.toLowerCase()}:`;
  const store = customOptions.store !== undefined ? customOptions.store : createSharedRateLimitStore(prefix);

  const limiterOptions = {
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Fail-open gracefully on transient Redis hiccups so operations aren't blocked
    handler: (req, res, next, options) => {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      const errorInfo = getErrorMessage(category);

      res.status(429).json({
        success: false,
        statusCode: 429,
        code: category,
        message: errorInfo.message,
        requestId: req.id,
        retryAfter,
      });
    },
    ...customOptions,
  };

  if (store) {
    limiterOptions.store = store;
  }

  return rateLimit(limiterOptions);
}

// 1. Global Baseline Limiter across all API endpoints (100 req / 15 min)
const globalLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.GLOBAL,
  ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
);

// 2. Strict Authentication Limiter (Login, setup-super-admin) (10 req / 15 min)
const authLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.AUTH,
  ERROR_CATEGORIES.RATE_LIMIT_LOGIN
);

// 3. Staff Users Directory Limiter (100 req / 15 min)
const usersLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.USERS,
  ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
);

// 4. CRM Pipeline Limiter (120 req / 15 min)
const pipelineLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.PIPELINE,
  ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
);

// 5. Heavy Reports Limiter (30 req / 15 min)
const reportsLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.REPORTS,
  ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
);

// 6. File Upload Limiter (20 req / 15 min)
const uploadsLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.UPLOADS,
  ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
);

// 7. Dedicated Refresh Token Limiter (20 req / 15 min baseline) (SEC-09)
const refreshLimiter = createShieldLimiter(
  SHIELD_CONFIG.RATE_LIMITS.REFRESH,
  ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
);

module.exports = {
  createShieldLimiter,
  globalLimiter,
  authLimiter,
  refreshLimiter,
  usersLimiter,
  pipelineLimiter,
  reportsLimiter,
  uploadsLimiter,
};
