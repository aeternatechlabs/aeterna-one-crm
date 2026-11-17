/**
 * OpenCode Independent Security Tests — HTTP Hardening (headers, CORS,
 * 404/500 shape, health, rate limiting). Real HTTP against an ephemeral
 * listener; rate-limit test deliberately runs LAST to exhaust the budget.
 * Known gaps asserted with { todo: true } document ideal behavior.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_hard';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'opencode-independent-test-secret-9f8e7d6c';
process.env.MONGO_URI = TEST_MONGO_URI;
delete process.env.CLIENT_URL;
delete process.env.FRONTEND_URL;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');

let server;
let baseUrl;

const fetchRaw = (path, opts = {}) => fetch(baseUrl + path, opts);

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await User.create({
    name: 'OC Hard User',
    email: 'oc.hard@test.local',
    password: 'Password@123',
    role: 'counsellor',
    branch: 'bengaluru',
  });
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

test('helmet security headers are present on responses', async () => {
  const res = await fetchRaw('/health');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('x-frame-options'), 'x-frame-options set');
  assert.ok(res.headers.get('content-security-policy'), 'CSP set');
  assert.ok(res.headers.get('referrer-policy'), 'referrer-policy set');
  assert.ok(res.headers.get('strict-transport-security'), 'HSTS set');
});

test('FINDING P3: X-Powered-By disclosure header should be removed', async () => {
  const res = await fetchRaw('/health');
  assert.equal(res.headers.get('x-powered-by'), null, 'X-Powered-By must not advertise Express');
});

test('unknown API endpoint returns structured 404 JSON', async () => {
  const res = await fetchRaw('/api/v1/definitely-not-a-route');
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.statusCode, 404);
  assert.match(body.message, /does not exist/);
});

test('top-level unknown path also returns structured 404', async () => {
  const res = await fetchRaw('/no-such-page');
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});

test('GET /health reports service info and live database state', async () => {
  const res = await fetchRaw('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'healthy');
  assert.equal(body.service, 'aeterna-one-crm-backend');
  assert.equal(body.database, 'connected', 'database field reflects live connection');
  assert.ok(typeof body.uptimeSeconds === 'number');
});

test('FINDING P2: health status must flip to unhealthy when the database is down', async () => {
  await mongoose.disconnect();
  try {
    const res = await fetchRaw('/health');
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.database, 'disconnected', 'database field reports disconnect');
    assert.equal(body.status, 'unhealthy', 'status must report unhealthy while DB is down');
  } finally {
    await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }
});

test('CORS reflects an allowed dev origin with credentials support', async () => {
  const res = await fetchRaw('/health', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
});

test('CORS preflight allows Authorization and x-branch headers', async () => {
  const res = await fetchRaw('/api/v1/pipeline', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,x-branch',
    },
  });
  assert.ok([200, 204].includes(res.status), `preflight succeeded, got ${res.status}`);
  const allowHeaders = (res.headers.get('access-control-allow-headers') || '').toLowerCase();
  assert.match(allowHeaders, /authorization/);
  assert.match(allowHeaders, /x-branch/);
});

test('CORS in production rejects an unknown origin with 500 policy error', async () => {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await fetchRaw('/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(res.status, 500, 'unknown origin rejected');
    const body = await res.json();
    assert.equal(body.message, 'Not allowed by CORS policy');
    assert.equal(body.stack, undefined, 'no stack outside development');
    assert.equal(res.headers.get('access-control-allow-origin'), null, 'no ACAO granted');
  } finally {
    process.env.NODE_ENV = saved;
  }
});

test('FINDING P1: development mode must not allow arbitrary CORS origins', async () => {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const res = await fetchRaw('/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(res.headers.get('access-control-allow-origin'), null, 'evil origin must be denied even in development');
  } finally {
    process.env.NODE_ENV = saved;
  }
});

test('P1-CORS: legitimate dev origin (localhost:3000) is allowed with credentials in development', async () => {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const res = await fetchRaw('/health', { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    process.env.NODE_ENV = saved;
  }
});

test('FINDING P2: development error responses must not include stack traces', async () => {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const res = await fetchRaw('/api/v1/auth/me', { headers: { Authorization: 'Bearer invalid.token.here' } });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.stack, undefined, 'stack traces leak file paths and must stay off by default');
  } finally {
    process.env.NODE_ENV = saved;
  }
});

test('error responses outside development never include stack traces', async () => {
  const res = await fetchRaw('/api/v1/auth/me', { headers: { Authorization: 'Bearer invalid.token.here' } });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.stack, undefined);
  assert.equal(body.success, false);
});

test('rate limiting returns 429 with structured body and standard headers (runs last)', async () => {
  let sawRateLimitHeader = false;
  let limited = null;
  let attempts = 0;
  for (; attempts < 130; attempts++) {
    const res = await fetchRaw('/api/v1/health');
    if (res.headers.get('ratelimit-remaining') || res.headers.get('ratelimit-limit') || res.headers.get('ratelimit')) {
      sawRateLimitHeader = true;
    }
    if (res.status === 429) {
      limited = res;
      break;
    }
    assert.equal(res.status, 200, 'pre-limit requests succeed');
  }
  assert.ok(limited, `429 must trigger within budget (attempts=${attempts})`);
  const body = await limited.json();
  assert.equal(body.success, false);
  assert.equal(body.statusCode, 429);
  assert.match(body.message, /Too many requests/);
  assert.ok(sawRateLimitHeader, 'standard RateLimit-* headers observed');

  const again = await fetchRaw('/api/v1/health');
  assert.equal(again.status, 429, 'subsequent requests stay blocked in the window');
});
