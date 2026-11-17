const crypto = require('crypto');

/**
 * Assigns or propagates a unique Request ID for every incoming HTTP request.
 * Sets req.id and returns X-Request-Id response header.
 */
function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId && typeof existingId === 'string' && existingId.length <= 64
    ? existingId.trim()
    : `req-${crypto.randomUUID()}`;

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
