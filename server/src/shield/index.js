/**
 * Aeterna One — API Shield Facade
 */

const {
  PERSONALITY_STYLES,
  ERROR_CATEGORIES,
  ERROR_CATALOGUE,
  getErrorMessage,
  getCategoryForStatus,
} = require('./errorCatalogue');

const SHIELD_CONFIG = require('./shieldConfig');

const {
  createShieldLimiter,
  globalLimiter,
  authLimiter,
  refreshLimiter,
  usersLimiter,
  pipelineLimiter,
  reportsLimiter,
  uploadsLimiter,
} = require('./rateLimiters');

const {
  validateContentType,
  handleParserErrors,
} = require('./payloadShield');

const {
  sanitizeObject,
  logSecurityEvent,
} = require('./securityLogger');

module.exports = {
  PERSONALITY_STYLES,
  ERROR_CATEGORIES,
  ERROR_CATALOGUE,
  getErrorMessage,
  getCategoryForStatus,
  SHIELD_CONFIG,
  createShieldLimiter,
  globalLimiter,
  authLimiter,
  refreshLimiter,
  usersLimiter,
  pipelineLimiter,
  reportsLimiter,
  uploadsLimiter,
  validateContentType,
  handleParserErrors,
  sanitizeObject,
  logSecurityEvent,
};
