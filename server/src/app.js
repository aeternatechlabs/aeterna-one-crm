const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const hpp = require('hpp');

const v1Routes = require('./routes/v1');
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

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 1. Request ID Tracking & Security Headers
app.use(requestIdMiddleware);
app.use(helmet());

// 2. Prevent HTTP parameter pollution
app.use(hpp());

// 3. CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.indexOf(origin) !== -1 ||
        (process.env.CORS_ALLOW_ALL_DEV === 'true' && process.env.NODE_ENV === 'development');

      if (isAllowed) {
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

// 4. General Parsers, Payload Shield & Compression
app.use(compression());
app.use(validateContentType);
app.use(express.json({ limit: SHIELD_CONFIG.PAYLOAD.JSON_LIMIT }));
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

// 7. Top-level direct health check
app.get('/health', getHealth);

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
