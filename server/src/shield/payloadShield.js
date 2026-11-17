/**
 * Aeterna One — Payload & Request Shield
 *
 * Validates Content-Type headers, detects oversized payloads, and handles malformed JSON.
 */

const { getErrorMessage, ERROR_CATEGORIES } = require('./errorCatalogue');
const SHIELD_CONFIG = require('./shieldConfig');

/**
 * Rejects unsupported or missing Content-Types on mutation requests with payload bodies
 * SEC-05: Handles both Content-Length and chunked Transfer-Encoding to prevent header bypass
 */
function validateContentType(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Detect whether request contains an incoming payload body
  const transferEncoding = req.headers['transfer-encoding'];
  const contentLength = req.headers['content-length'];

  const hasChunkedPayload =
    typeof transferEncoding === 'string' && transferEncoding.toLowerCase().includes('chunked');
  const hasLengthPayload =
    contentLength !== undefined && contentLength !== '0' && parseInt(contentLength, 10) > 0;

  const hasPayload = hasChunkedPayload || hasLengthPayload;

  // Requests without payload bodies (e.g. empty POST /logout) pass through safely
  if (!hasPayload) {
    return next();
  }

  const rawContentType = req.headers['content-type'];
  const contentType = (rawContentType || '').toLowerCase().trim();

  // SEC-05: Reject requests that send a payload without a Content-Type header
  if (!contentType) {
    const errorInfo = getErrorMessage(ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE);
    return res.status(415).json({
      success: false,
      statusCode: 415,
      code: ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE,
      message: 'Content-Type header is required for requests containing a payload.',
      requestId: req.id,
      allowedTypes: SHIELD_CONFIG.ALLOWED_CONTENT_TYPES,
    });
  }

  const isAllowed = SHIELD_CONFIG.ALLOWED_CONTENT_TYPES.some((allowed) =>
    contentType.startsWith(allowed)
  );

  if (!isAllowed) {
    const errorInfo = getErrorMessage(ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE);
    return res.status(415).json({
      success: false,
      statusCode: 415,
      code: ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE,
      message: errorInfo.message,
      requestId: req.id,
      allowedTypes: SHIELD_CONFIG.ALLOWED_CONTENT_TYPES,
    });
  }

  next();
}

/**
 * Intercepts express body parser errors (malformed JSON, payload too large)
 */
function handleParserErrors(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const errorInfo = getErrorMessage(ERROR_CATEGORIES.INVALID_JSON);
    return res.status(400).json({
      success: false,
      statusCode: 400,
      code: ERROR_CATEGORIES.INVALID_JSON,
      message: errorInfo.message,
      requestId: req.id,
    });
  }

  if (err && (err.status === 413 || err.type === 'entity.too.large')) {
    const errorInfo = getErrorMessage(ERROR_CATEGORIES.PAYLOAD_TOO_LARGE);
    return res.status(413).json({
      success: false,
      statusCode: 413,
      code: ERROR_CATEGORIES.PAYLOAD_TOO_LARGE,
      message: errorInfo.message,
      requestId: req.id,
      limit: SHIELD_CONFIG.PAYLOAD.JSON_LIMIT,
    });
  }

  next(err);
}

module.exports = {
  validateContentType,
  handleParserErrors,
};
