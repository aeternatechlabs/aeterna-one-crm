const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const hpp = require('hpp');

const v1Routes = require('./routes/v1');
const swaggerRoutes = require('./docs/swagger.routes');
const { getHealth } = require('./modules/health/health.controller');
const errorHandler = require('./middleware/errorHandlerMiddleware');
const requestIdMiddleware = require('./middleware/requestIdMiddleware');
const {
  globalLimiter,
  SHIELD_CONFIG,
  validateContentType,
  handleParserErrors,
  getErrorMessage,
  ERROR_CATEGORIES,
} = require('./shield');

const app = express();

// Configure trusted proxy hops for accurate client IP identification and anti-spoofing (SEC-VULN-08)
const trustProxyConfig =
  process.env.TRUST_PROXY !== undefined
    ? process.env.TRUST_PROXY === 'true'
      ? true
      : process.env.TRUST_PROXY === 'false'
      ? false
      : !isNaN(Number(process.env.TRUST_PROXY))
      ? Number(process.env.TRUST_PROXY)
      : process.env.TRUST_PROXY
    : process.env.NODE_ENV === 'production'
    ? 1
    : false;

if (trustProxyConfig !== false) {
  app.set('trust proxy', trustProxyConfig);
}

// 1. Request ID Tracking & Security Headers
app.use(requestIdMiddleware);
app.use((req, res, next) => {
  if (req.path.startsWith('/api-docs') || req.path === '/docs') {
    return next();
  }
  return helmet()(req, res, next);
});

// 2. Prevent HTTP parameter pollution
app.use(hpp());

// 3. CORS configuration & Origin Containment (SEC-VULN-02 Hardened)
/**
 * Normalizes an origin string into a canonical ${protocol}//${host} format.
 * Returns null if origin is malformed or protocol is invalid.
 */
function normalizeOrigin(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Builds the explicit set of authorized origins.
 * In production: strictly populated from CLIENT_URL, FRONTEND_URL, and ALLOWED_ORIGINS.
 * In development/test: includes standard local frontend dev ports.
 */
function getAllowedOrigins() {
  const origins = new Set();

  const envOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]
    .filter(Boolean)
    .flatMap((url) => String(url).split(',').map((u) => u.trim()))
    .filter(Boolean);

  for (const raw of envOrigins) {
    const normalized = normalizeOrigin(raw);
    if (normalized) origins.add(normalized);
  }

  // Development & Test local origins restricted to non-production environments
  if (process.env.NODE_ENV !== 'production') {
    [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ].forEach((devOrigin) => origins.add(devOrigin.toLowerCase()));
  }

  return origins;
}

/**
 * Validates whether an incoming HTTP request origin is authorized.
 * Enforces URL parsing, protocol validation, explicit allowlist, and project-specific preview validation.
 */
function isOriginAllowed(origin) {
  // Allow requests with no origin (e.g., mobile apps, curl, same-origin server requests)
  if (!origin) return true;

  if (typeof origin !== 'string') return false;

  let parsed;
  try {
    parsed = new URL(origin.trim());
  } catch {
    return false; // Malformed origin rejected
  }

  // Only HTTP and HTTPS protocols are permitted
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const normalizedOrigin = `${parsed.protocol}//${parsed.host}`.toLowerCase();
  const allowed = getAllowedOrigins();

  // 1. Direct match against explicit allowlist
  if (allowed.has(normalizedOrigin)) {
    return true;
  }

  // 2. Explicit development bypass only when explicitly configured
  if (process.env.CORS_ALLOW_ALL_DEV === 'true' && process.env.NODE_ENV === 'development') {
    return true;
  }

  // 3. Verified project-specific Vercel preview domains
  // Allows preview domains only if ALLOW_VERCEL_PREVIEWS !== 'false' and origin is HTTPS
  const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS !== 'false';
  if (allowVercelPreviews && parsed.protocol === 'https:') {
    const projectName = (process.env.VERCEL_PROJECT_NAME || 'aeterna-one-crm').toLowerCase().trim();
    const hostname = parsed.hostname.toLowerCase();

    // Strict hostname verification: must end with .vercel.app
    if (hostname.endsWith('.vercel.app')) {
      const subdomains = hostname.slice(0, -'.vercel.app'.length);
      // Valid patterns:
      // - Exactly the project name: "aeterna-one-crm"
      // - Project preview deployment: "aeterna-one-crm-<branch-or-hash>" (alphanumeric and hyphens only)
      if (subdomains === projectName || (subdomains.startsWith(`${projectName}-`) && /^[a-z0-9-]+$/.test(subdomains))) {
        return true;
      }
    }
  }

  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-branch', 'x-developer-key', 'x-setup-key', 'x-request-id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
);

app.corsHelpers = {
  normalizeOrigin,
  getAllowedOrigins,
  isOriginAllowed,
};

// 4. General Parsers, Payload Shield & Compression
app.use(compression());
app.use(validateContentType);
app.use(express.json({ limit: SHIELD_CONFIG.PAYLOAD.JSON_LIMIT, strict: false }));
app.use(express.urlencoded({ extended: true, limit: SHIELD_CONFIG.PAYLOAD.URLENCODED_LIMIT }));
app.use(handleParserErrors);
app.use(cookieParser());

// 5. HTTP Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 6. Global API Rate Limiting Foundation (100 req / 15 min)
app.use('/api', globalLimiter);

// 7. Top-level direct health check & Swagger API Explorer
app.get('/health', getHealth);
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  app.get('/docs', (req, res) => res.redirect('/api-docs'));
  app.use('/api-docs', swaggerRoutes);
}

// 8. API version 1 routes
app.use('/api/v1', v1Routes);

// Alias /api to /api/v1 for ease of use
app.use('/api', v1Routes);

// 9. 404 Route Handler with Smart Error Notice
app.use((req, res) => {
  const errorInfo = getErrorMessage(ERROR_CATEGORIES.NOT_FOUND);
  const message = `${errorInfo.message} (endpoint '${req.method} ${req.originalUrl}' does not exist on this server).`;

  res.status(404).json({
    success: false,
    statusCode: 404,
    code: ERROR_CATEGORIES.NOT_FOUND,
    message,
    requestId: req.id,
  });
});

// 10. Centralized Global Error Handler
app.use(errorHandler);

module.exports = app;
