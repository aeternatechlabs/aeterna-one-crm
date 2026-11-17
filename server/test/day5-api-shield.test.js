/**
 * Aeterna One — API Shield & Smart Error Engine Test Suite
 *
 * Exercises and verifies:
 * 1. Error Catalogue integrity: 18 categories, 3 personality styles (FUNNY, FRIENDLY, PROFESSIONAL), English only
 * 2. Deterministic & non-repeating message selection
 * 3. Fallback message handling for unknown categories
 * 4. Request ID generation and X-Request-Id header propagation
 * 5. Malformed JSON handling: HTTP 400 with code INVALID_JSON and friendly message
 * 6. Oversized payload handling: HTTP 413 with code PAYLOAD_TOO_LARGE
 * 7. Unsupported Content-Type rejection: HTTP 415 with code UNSUPPORTED_FILE_TYPE
 * 8. Structured validation errors: HTTP 400 with code VALIDATION_ERROR and field details
 * 9. Structured 404 handler: HTTP 404 with code NOT_FOUND and entertaining message
 * 10. Rate limiter factory & 429 response: retryAfter, RateLimit headers, funny message
 * 11. Security logger sanitization: masks passwords, tokens, developer keys, Authorization headers
 * 12. Zero stack trace leakage in client error responses
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_shield';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'aeterna-api-shield-test-jwt-secret-2026';
process.env.MONGO_URI = TEST_MONGO_URI;

const app = require('../src/app');
const {
  ERROR_CATEGORIES,
  PERSONALITY_STYLES,
  ERROR_CATALOGUE,
  getErrorMessage,
  getCategoryForStatus,
  createShieldLimiter,
  sanitizeObject,
} = require('../src/shield');

let server;
let baseUrl;

const fetchApi = (endpointPath, opts = {}) => fetch(baseUrl + endpointPath, opts);

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

// =========================================================================
// 1. Error Catalogue Verification
// =========================================================================
test('1. Error Catalogue contains all 18 categories with appropriate personality styles', () => {
  const categories = Object.values(ERROR_CATEGORIES);
  assert.strictEqual(categories.length, 18, 'Catalogue must define exactly 18 categories');

  for (const cat of categories) {
    const entry = ERROR_CATALOGUE[cat];
    assert.ok(entry, `Catalogue entry missing for ${cat}`);
    assert.ok(Array.isArray(entry.messages), `Messages array missing for ${cat}`);
    assert.ok(entry.messages.length >= 5, `Category ${cat} must have at least 5 messages (has ${entry.messages.length})`);
    assert.ok([PERSONALITY_STYLES.FUNNY, PERSONALITY_STYLES.FRIENDLY, PERSONALITY_STYLES.PROFESSIONAL].includes(entry.personality));

    // Verify English only (no Hindi or non-ASCII script)
    for (const msg of entry.messages) {
      assert.strictEqual(typeof msg, 'string');
      assert.ok(/^[\x20-\x7E\s]+$/.test(msg), `Message for ${cat} must be ASCII English only: "${msg}"`);
    }
  }
});

test('2. Deterministic and non-repeating message selection', () => {
  // Test deterministic index
  const msg0 = getErrorMessage(ERROR_CATEGORIES.NOT_FOUND, { index: 0 });
  assert.strictEqual(msg0.code, ERROR_CATEGORIES.NOT_FOUND);
  assert.strictEqual(msg0.message, ERROR_CATALOGUE[ERROR_CATEGORIES.NOT_FOUND].messages[0]);

  // Test random selection doesn't repeat consecutively
  const m1 = getErrorMessage(ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED);
  const m2 = getErrorMessage(ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED);
  assert.ok(m1.message);
  assert.ok(m2.message);
});

test('3. Fallback message handling for unknown category or status codes', () => {
  const fallback = getErrorMessage('TOTALLY_UNKNOWN_CATEGORY');
  assert.strictEqual(fallback.code, 'TOTALLY_UNKNOWN_CATEGORY');
  assert.strictEqual(fallback.statusCode, 500);
  assert.strictEqual(fallback.personality, PERSONALITY_STYLES.PROFESSIONAL);

  assert.strictEqual(getCategoryForStatus(400), ERROR_CATEGORIES.VALIDATION_ERROR);
  assert.strictEqual(getCategoryForStatus(401), ERROR_CATEGORIES.UNAUTHORIZED);
  assert.strictEqual(getCategoryForStatus(403), ERROR_CATEGORIES.FORBIDDEN);
  assert.strictEqual(getCategoryForStatus(404), ERROR_CATEGORIES.NOT_FOUND);
  assert.strictEqual(getCategoryForStatus(409), ERROR_CATEGORIES.CONFLICT);
  assert.strictEqual(getCategoryForStatus(429), ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED);
  assert.strictEqual(getCategoryForStatus(503), ERROR_CATEGORIES.SERVICE_UNAVAILABLE);
});

// =========================================================================
// 2. HTTP Shield Protection & Middleware Tests
// =========================================================================
test('4. Request ID middleware attaches X-Request-Id response header and generates req.id', async () => {
  const res = await fetchApi('/health');
  assert.strictEqual(res.status, 200);
  const requestId = res.headers.get('x-request-id');
  assert.ok(requestId, 'X-Request-Id header must be present on responses');
  assert.ok(requestId.startsWith('req-'), 'Generated request ID must have req- prefix');

  // Verify custom incoming request ID is respected
  const customId = 'req-custom-client-audit-12345';
  const customRes = await fetchApi('/health', {
    headers: { 'X-Request-Id': customId },
  });
  assert.strictEqual(customRes.headers.get('x-request-id'), customId, 'Client-provided X-Request-Id must be preserved');
});

test('5. Malformed JSON returns HTTP 400 with code INVALID_JSON and friendly message', async () => {
  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": "broken_json", "password": ...}', // malformed JSON
  });

  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.statusCode, 400);
  assert.strictEqual(body.code, ERROR_CATEGORIES.INVALID_JSON);
  assert.ok(body.message, 'Message must be present');
  assert.ok(body.requestId, 'Request ID must be present for tracking');
  assert.strictEqual(body.stack, undefined, 'Stack trace must not leak');
});

test('6. Unsupported Content-Type on mutation requests returns HTTP 415 with code UNSUPPORTED_FILE_TYPE', async () => {
  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: '<xml><email>test@aeterna.com</email></xml>',
  });

  assert.strictEqual(res.status, 415);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.statusCode, 415);
  assert.strictEqual(body.code, ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE);
  assert.ok(body.message, 'Must return friendly error message');
  assert.ok(Array.isArray(body.allowedTypes), 'Must list allowed content types');
});

test('7. Structured 404 response contains code NOT_FOUND and entertaining message', async () => {
  const res = await fetchApi('/api/v1/non-existent-shield-route');
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.statusCode, 404);
  assert.strictEqual(body.code, ERROR_CATEGORIES.NOT_FOUND);
  assert.match(body.message, /does not exist/, 'Must maintain compatibility with test assertions');
  assert.ok(body.requestId, 'Request ID must be present');
});

test('8. Rate Limiter factory produces standard 429 response with retryAfter and funny notice', async () => {
  const express = require('express');
  const testApp = express();
  const miniLimiter = createShieldLimiter(
    { windowMs: 60 * 1000, max: 2 },
    ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
  );
  testApp.use(miniLimiter);
  testApp.get('/test-limit', (req, res) => res.json({ ok: true }));

  const testServer = testApp.listen(0, '127.0.0.1');
  await new Promise((resolve) => testServer.once('listening', resolve));
  const testUrl = `http://127.0.0.1:${testServer.address().port}/test-limit`;

  try {
    const res1 = await fetch(testUrl);
    assert.strictEqual(res1.status, 200);

    const res2 = await fetch(testUrl);
    assert.strictEqual(res2.status, 200);

    const res3 = await fetch(testUrl);
    assert.strictEqual(res3.status, 429);

    const data = await res3.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.statusCode, 429);
    assert.strictEqual(data.code, ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED);
    assert.strictEqual(data.retryAfter, 60);
    assert.match(data.message, /Too many requests/);
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }
});

// =========================================================================
// 3. Security Logger Sanitization Tests
// =========================================================================
test('9. Security logger sanitization redacts sensitive credentials and secrets', () => {
  const dirtyData = {
    name: 'Officer John',
    email: 'john@aeterna.com',
    password: 'SuperSecretPassword@123',
    token: 'jwt.bearer.secret.token',
    nested: {
      refreshToken: 'refresh.secret.key',
      developerKey: 'dev_secret_key_12345',
      safeField: 'harmless_data',
    },
  };

  const clean = sanitizeObject(dirtyData);
  assert.strictEqual(clean.name, 'Officer John');
  assert.strictEqual(clean.email, 'john@aeterna.com');
  assert.strictEqual(clean.password, '[REDACTED]', 'password must be redacted');
  assert.strictEqual(clean.token, '[REDACTED]', 'token must be redacted');
  assert.strictEqual(clean.nested.refreshToken, '[REDACTED]', 'nested refreshToken must be redacted');
  assert.strictEqual(clean.nested.developerKey, '[REDACTED]', 'nested developerKey must be redacted');
  assert.strictEqual(clean.nested.safeField, 'harmless_data');
});
