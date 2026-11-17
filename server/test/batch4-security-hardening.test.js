/**
 * Batch 4: Security Hardening Tests (SEC-10 & SEC-11 Simplified)
 *
 * Verifies:
 * - SEC-10: Permissive Password Complexity Baseline (8-128 chars, uppercase, digit, special char, no trim, schema + controller + validator)
 * - SEC-11: In-Memory Rate Limiting for Single-Process Architecture (~25 users)
 *   (Threshold enforcement, RateLimit headers, 429 response structure, zero-Redis runtime dependency)
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_batch4_sec';
const VALID_DEV_KEY = 'batch4_audit_secret_dev_key_2026';
const JWT_SECRET = 'batch4_audit_jwt_secret_key_2026';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGO_URI = TEST_MONGO_URI;
process.env.DEVELOPER_SETUP_KEY = VALID_DEV_KEY;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const { ROLES, BRANCHES } = require('../src/config/constants');
const {
  PASSWORD_POLICY,
  validatePasswordComplexity,
} = require('../src/utils/passwordPolicy');
const {
  createShieldLimiter,
  authLimiter,
  refreshLimiter,
  globalLimiter,
  ERROR_CATEGORIES,
  SHIELD_CONFIG,
} = require('../src/shield');

let server;
let baseUrl;

const fetchApi = (endpointPath, opts = {}) => fetch(baseUrl + endpointPath, opts);

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await User.init();

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

beforeEach(async () => {
  process.env.DEVELOPER_SETUP_KEY = VALID_DEV_KEY;
  await User.deleteMany({});
});

// Helper to get authenticated Super Admin token
async function provisionSuperAdmin(email = 'super.batch4@aeterna.com', password = 'SuperPassword@2026') {
  const user = await User.create({
    name: 'Batch4 Super Admin',
    email,
    password,
    role: ROLES.SUPER_ADMIN,
    branch: BRANCHES.ALL,
  });

  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { user, token: data.token };
}

// ============================================================================
// SEC-10: Unified Password Complexity Baseline
// ============================================================================

test('SEC-10.1: validatePasswordComplexity validates policy rules directly', () => {
  // Too short (< 8)
  assert.strictEqual(validatePasswordComplexity('Abc1!').valid, false);
  assert.strictEqual(validatePasswordComplexity('123456').valid, false);

  // Missing uppercase
  assert.strictEqual(validatePasswordComplexity('password@123').valid, false);

  // Missing digit
  assert.strictEqual(validatePasswordComplexity('Password@Special').valid, false);

  // Missing special char
  assert.strictEqual(validatePasswordComplexity('Password12345').valid, false);

  // Too long (> 128)
  const longPass = 'A1!' + 'a'.repeat(126);
  assert.strictEqual(validatePasswordComplexity(longPass).valid, false);

  // Valid password (8-128 chars, uppercase, digit, special char)
  assert.strictEqual(validatePasswordComplexity('P@ssword123').valid, true);
  assert.strictEqual(validatePasswordComplexity('A1!abcdefghij').valid, true);
});

test('SEC-10.2: Passwords are not trimmed before complexity check', () => {
  const withSpaces = ' P@ss1 '; // length 7
  assert.strictEqual(validatePasswordComplexity(withSpaces).valid, false);

  const validWithSpace = ' P@ssword1 '; // length 11, has uppercase, digit, special, and space
  assert.strictEqual(validatePasswordComplexity(validWithSpace).valid, true);
});

test('SEC-10.3: Super Admin setup rejects weak passwords (< 8 chars, missing categories)', async () => {
  const weakPasswords = [
    '123456',
    'abcdef',
    'Short1!',
    'nouppercase@123',
    'NODIGITS@SPECIAL',
    'NoSpecialChar123',
  ];

  for (const password of weakPasswords) {
    const res = await fetchApi('/api/v1/auth/setup-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-developer-key': VALID_DEV_KEY,
      },
      body: JSON.stringify({
        name: 'Weak Admin',
        email: `weak.${Date.now()}.${Math.random()}@aeterna.com`,
        password,
      }),
    });

    assert.strictEqual(res.status, 400, `Password "${password}" must be rejected with 400`);
    const data = await res.json();
    assert.strictEqual(data.message, PASSWORD_POLICY.ERROR_MESSAGE);
  }
});

test('SEC-10.4: Super Admin setup accepts strong password meeting all criteria', async () => {
  const res = await fetchApi('/api/v1/auth/setup-super-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': VALID_DEV_KEY,
    },
    body: JSON.stringify({
      name: 'Strong Super Admin',
      email: 'strong.super@aeterna.com',
      password: 'StrongP@ssword2026',
    }),
  });

  assert.strictEqual(res.status, 201, 'Valid strong password must successfully provision Super Admin');
  const data = await res.json();
  assert.strictEqual(data.success, true);
  const user = data.user || data.data?.user;
  assert.strictEqual(user.email, 'strong.super@aeterna.com');
  assert.strictEqual(user.password, undefined, 'Password must never be returned');
});

test('SEC-10.5: Staff registration via /register rejects weak passwords', async () => {
  const { token } = await provisionSuperAdmin();

  const weakPasswords = ['123456', 'weakpass', 'Weakpass1', 'weakpass@1'];

  for (const password of weakPasswords) {
    const res = await fetchApi('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Staff',
        email: `staff.${Date.now()}.${Math.random()}@aeterna.com`,
        password,
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.BENGALURU,
      }),
    });

    assert.strictEqual(res.status, 400, `Registration password "${password}" must be rejected with 400`);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Password') || data.message.includes('validation'));
  }
});

test('SEC-10.6: Staff registration accepts valid password and hashes without modification', async () => {
  const { token } = await provisionSuperAdmin();

  const validPassword = 'CompliantP@ssword!99';
  const email = 'compliant.staff@aeterna.com';

  const res = await fetchApi('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Compliant Staff',
      email,
      password: validPassword,
      role: ROLES.COUNSELLOR,
      branch: BRANCHES.BENGALURU,
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  const user = data.user || data.data?.user;
  assert.strictEqual(user.password, undefined);

  // Verify can log in with exact password
  const loginRes = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: validPassword }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login with compliant password must succeed');
});

test('SEC-10.7: Existing hashed passwords in database are not broken or invalidated', async () => {
  const existingUser = await User.create({
    name: 'Legacy User',
    email: 'legacy.user@aeterna.com',
    password: 'LegacyPassword@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  existingUser.name = 'Updated Legacy User Name';
  await existingUser.save();

  const refreshed = await User.findById(existingUser._id);
  assert.strictEqual(refreshed.name, 'Updated Legacy User Name');

  const loginRes = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'legacy.user@aeterna.com', password: 'LegacyPassword@123' }),
  });
  assert.strictEqual(loginRes.status, 200);
});

// ============================================================================
// SEC-11: In-Memory Rate Limiting Architecture (Single-Process Deployment)
// ============================================================================

test('SEC-11.1: In-memory rate limiter factory enforces max threshold and standard headers', async () => {
  const testLimiter = createShieldLimiter(
    { windowMs: 60000, max: 3 },
    ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED
  );

  const testApp = express();
  testApp.use(testLimiter);
  testApp.get('/test-in-memory', (req, res) => res.json({ ok: true }));

  const testServer = testApp.listen(0, '127.0.0.1');
  await new Promise((resolve) => testServer.once('listening', resolve));
  const testUrl = `http://127.0.0.1:${testServer.address().port}/test-in-memory`;

  try {
    // 1st request
    const res1 = await fetch(testUrl);
    assert.strictEqual(res1.status, 200);
    assert.ok(res1.headers.get('ratelimit-limit'), 'Must include ratelimit-limit header');
    assert.strictEqual(res1.headers.get('ratelimit-remaining'), '2');

    // 2nd request
    const res2 = await fetch(testUrl);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.headers.get('ratelimit-remaining'), '1');

    // 3rd request (Hits max)
    const res3 = await fetch(testUrl);
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.headers.get('ratelimit-remaining'), '0');

    // 4th request (Exceeds threshold -> 429)
    const res4 = await fetch(testUrl);
    assert.strictEqual(res4.status, 429, 'Must reject with 429 when quota exceeded');

    const body4 = await res4.json();
    assert.strictEqual(body4.success, false);
    assert.strictEqual(body4.statusCode, 429);
    assert.strictEqual(body4.code, ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED);
    assert.ok(body4.message, 'Must return informative error message');
    assert.ok(body4.retryAfter > 0, 'Must include retryAfter parameter');
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }
});

test('SEC-11.2: Server and rate limiters operate without any Redis dependencies or configuration', () => {
  assert.strictEqual(process.env.REDIS_URL, undefined, 'REDIS_URL must not be required');
  assert.strictEqual(process.env.REDIS_HOST, undefined, 'REDIS_HOST must not be required');
  assert.strictEqual(SHIELD_CONFIG.REDIS, undefined, 'SHIELD_CONFIG must have no REDIS block');

  assert.ok(typeof globalLimiter === 'function', 'globalLimiter must be functional');
  assert.ok(typeof authLimiter === 'function', 'authLimiter must be functional');
  assert.ok(typeof refreshLimiter === 'function', 'refreshLimiter must be functional');
});

test('SEC-11.3: In-memory rate limiting operates correctly on live app endpoints', async () => {
  // Verify live API endpoint returns standard rate limit headers
  const res = await fetchApi('/api/v1/health');
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get('ratelimit-limit') !== null, 'Live API endpoint must return rate limit headers');
});
