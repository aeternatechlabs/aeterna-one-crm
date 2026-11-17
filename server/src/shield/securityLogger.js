/**
 * Aeterna One — Security Event Logger
 *
 * Captures and structures security-relevant events without logging sensitive data.
 * Redacts: passwords, tokens, developer keys, Authorization headers, and cookies.
 */

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'developerkey',
  'setupkey',
  'x-developer-key',
  'x-setup-key',
  'secret',
  'jwt_secret',
]);

/**
 * Sanitize an object by recursively masking sensitive field values
 */
function sanitizeObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeObject(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Log a structured security event (400, 401, 403, 404, 413, 429, 500)
 */
function logSecurityEvent(req, res, err = null) {
  const statusCode = res.statusCode || (err && err.statusCode) || 500;

  // Only log security-relevant or failure statuses
  if (statusCode < 400 && statusCode !== 429) {
    return;
  }

  const clientIp = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.socket?.remoteAddress || req.ip || 'unknown';

  const event = {
    level: statusCode >= 500 ? 'ERROR' : 'WARN',
    category: 'SECURITY',
    requestId: req.id || req.headers['x-request-id'] || 'no-id',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    clientIp,
    userRole: req.user?.role || 'anonymous',
    userBranch: req.user?.branch || 'none',
    code: err?.code || res.locals?.shieldCode || 'API_SHIELD_EVENT',
    message: err?.message || 'Security threshold or error triggered',
  };

  // Safe request headers (redacted)
  if (req.headers) {
    event.headers = sanitizeObject({
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'x-branch': req.headers['x-branch'],
    });
  }

  // Safe sanitized query
  if (req.query && Object.keys(req.query).length > 0) {
    event.query = sanitizeObject(req.query);
  }

  // Format single-line JSON log for production ingestion
  const logString = `[API_SHIELD] ${JSON.stringify(event)}`;

  if (statusCode >= 500) {
    console.error(logString);
  } else {
    console.warn(logString);
  }

  return event;
}

module.exports = {
  sanitizeObject,
  logSecurityEvent,
};
