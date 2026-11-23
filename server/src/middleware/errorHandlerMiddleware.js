/**
 * Centralized Global Error Handler Middleware
 * Integrated with Aeterna One API Shield & Smart Error Engine
 */

const {
  ERROR_CATEGORIES,
  getErrorMessage,
  getCategoryForStatus,
} = require('../shield/errorCatalogue');
const { logSecurityEvent } = require('../shield/securityLogger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  let message = err.message || null;
  let errors = err.errors || null;
  let code = err.code && typeof err.code === 'string' ? err.code : null;

  // 1. Handle Malformed JSON SyntaxError from body-parser
  if (err instanceof SyntaxError && (statusCode === 400 || err.status === 400) && 'body' in err) {
    const raw = typeof err.body === 'string' ? err.body.trim() : err.body;
    if (!raw || raw === 'null' || raw === 'undefined' || raw === '{}' || raw === '') {
      req.body = {};
      return next();
    }
    statusCode = 400;
    code = ERROR_CATEGORIES.INVALID_JSON;
    if (!message || message.includes('Unexpected token') || message.includes('JSON')) {
      message = getErrorMessage(ERROR_CATEGORIES.INVALID_JSON).message;
    }
  }

  // 2. Handle Payload Too Large (HTTP 413)
  else if (statusCode === 413 || err.type === 'entity.too.large') {
    statusCode = 413;
    code = ERROR_CATEGORIES.PAYLOAD_TOO_LARGE;
    if (!message || message.includes('too large')) {
      message = getErrorMessage(ERROR_CATEGORIES.PAYLOAD_TOO_LARGE).message;
    }
  }

  // 3. Handle Mongoose Validation Error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ERROR_CATEGORIES.VALIDATION_ERROR;
    message = 'Validation Error';
    if (err.errors) {
      errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
    }
  }

  // 4. Handle Mongoose Duplicate Key Error (code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = ERROR_CATEGORIES.CONFLICT;
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
    message = `Duplicate field value: ${field} already exists`;
    errors = [{ field, message: `${field} already exists` }];
  }

  // 5. Handle Mongoose Invalid ObjectId CastError
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = ERROR_CATEGORIES.VALIDATION_ERROR;
    message = `Invalid ID format for path: ${err.path}`;
    errors = [{ field: err.path, message: 'Invalid identifier format' }];
  }

  // 6. Handle JWT Token Expiration
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ERROR_CATEGORIES.SESSION_EXPIRED;
    message = 'Authentication token has expired. Please log in again.';
  }

  // 7. Handle Generic JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ERROR_CATEGORIES.UNAUTHORIZED;
    message = 'Invalid authentication token';
  }

  // 8. Handle CORS Policy Error
  else if (err.message === 'Not allowed by CORS policy') {
    statusCode = 500;
    code = ERROR_CATEGORIES.FORBIDDEN;
    message = 'Not allowed by CORS policy';
  }

  // Determine standard code if not yet assigned
  if (!code) {
    code = getCategoryForStatus(statusCode);
  }

  // Fallback message from catalogue if message is missing or generic
  if (!message || message === 'Internal Server Error') {
    message = getErrorMessage(code).message;
  }

  const requestId = req.id || req.headers['x-request-id'] || `req-${Date.now()}`;

  const response = {
    success: false,
    statusCode,
    code,
    message,
    requestId,
  };

  if (statusCode === 429 && err.retryAfter) {
    response.retryAfter = err.retryAfter;
  }

  if (errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)) {
    response.errors = errors;
  }

  // Security logging for audit & debugging
  try {
    logSecurityEvent(req, res, { statusCode, code, message, errors });
  } catch (_) {}

  // Server console logging for 500 exceptions (dev only)
  if (process.env.NODE_ENV === 'development' && statusCode === 500 && err.stack) {
    console.error(`[INTERNAL_ERROR ${requestId}]`, err.stack);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
