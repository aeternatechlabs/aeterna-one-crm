/**
 * Batch 3: Critical Security Hardening Tests (SEC-07 to SEC-09)
 *
 * Verifies:
 * - SEC-07: Pipeline Stage Transition Concurrency Race Condition (Atomic updates, OCC 409 conflict, documentsVerified guard)
 * - SEC-08: Developer Setup Key Timing Attack (Constant-time comparison via crypto.timingSafeEqual, non-string safety, fail-closed)
 * - SEC-09: Dedicated Refresh Endpoint Rate Limiter (HTTP 429 on excessive requests, rate limiting protection)
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_batch3_sec';
const JWT_SECRET = 'batch3_audit_jwt_secret_key_2026';
const DEV_KEY = 'batch3_dev_secret_key_2026';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGO_URI = TEST_MONGO_URI;
process.env.DEVELOPER_SETUP_KEY = DEV_KEY;
// Dedicated refresh rate limiter threshold for testing
process.env.SHIELD_REFRESH_MAX = '5';
process.env.SHIELD_REFRESH_WINDOW_MS = '60000';

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES, BRANCHES, PIPELINE_STAGES } = require('../src/config/constants');

let server;
let baseUrl;

const rawHttpRequest = (method, path, headers = {}, body = '') => {
  const url = new URL(baseUrl + path);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(responseBody);
          } catch (_) {}
          resolve({ status: res.statusCode, headers: res.headers, body: json, text: responseBody });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
};

const jsonRequest = (method, path, bodyObj = null, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const bodyStr = bodyObj !== null ? JSON.stringify(bodyObj) : '';
  if (bodyStr) {
    headers['Content-Length'] = Buffer.byteLength(bodyStr);
  }
  return rawHttpRequest(method, path, headers, bodyStr);
};

const signTestToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      branch: user.branch,
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await User.init();
  await PipelineStudent.init();

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
  await User.deleteMany({});
  await PipelineStudent.deleteMany({});
});

// ============================================================================
// SEC-07: Pipeline Stage Transition Concurrency & Race Condition Tests
// ============================================================================

test('SEC-07.1: Valid sequential stage transitions succeed and record audit history atomically', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Alice',
    email: 'counsellor.alice@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 0,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Priya Sharma',
    email: 'priya.sharma@test.local',
    programme: 'MSc Computer Science',
    university: 'University of Oxford',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.NEW_ENQUIRY,
    documentsVerified: false,
  });

  const res = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.COUNSELLING, reason: 'Initial intake consultation booked' },
    token
  );

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.student.stage, PIPELINE_STAGES.COUNSELLING);

  const fresh = await PipelineStudent.findById(student._id);
  assert.strictEqual(fresh.stage, PIPELINE_STAGES.COUNSELLING);
  assert.strictEqual(fresh.stageHistory.length, 1);
  assert.strictEqual(fresh.stageHistory[0].fromStage, PIPELINE_STAGES.NEW_ENQUIRY);
  assert.strictEqual(fresh.stageHistory[0].toStage, PIPELINE_STAGES.COUNSELLING);
});

test('SEC-07.2: Transition to Application Submitted is rejected when documents are unverified', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Bob',
    email: 'counsellor.bob@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Rahul Varma',
    email: 'rahul.varma@test.local',
    programme: 'BSc Data Science',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.COUNSELLING,
    documentsVerified: false,
  });

  const res = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.APPLICATION_SUBMITTED },
    token
  );

  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /Academic transcripts & passport verification are pending/i);

  const fresh = await PipelineStudent.findById(student._id);
  assert.strictEqual(fresh.stage, PIPELINE_STAGES.COUNSELLING);
  assert.strictEqual(fresh.stageHistory.length, 0);
});

test('SEC-07.3: Transition to Application Submitted succeeds when documents are verified', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Charlie',
    email: 'counsellor.charlie@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Ananya Rao',
    email: 'ananya.rao@test.local',
    programme: 'MBA',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.SHORTLISTED,
    documentsVerified: true,
  });

  const res = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.APPLICATION_SUBMITTED },
    token
  );

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.student.stage, PIPELINE_STAGES.APPLICATION_SUBMITTED);
});

test('SEC-07.4: Concurrent conflicting stage updates return HTTP 409 Conflict instead of silent data loss', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Dave',
    email: 'counsellor.dave@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Kavita Patel',
    email: 'kavita.patel@test.local',
    programme: 'MA English',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.NEW_ENQUIRY,
    documentsVerified: true,
  });

  // Dispatch 5 concurrent transitions from NEW_ENQUIRY to different valid stages
  const targetStages = [
    PIPELINE_STAGES.COUNSELLING,
    PIPELINE_STAGES.SHORTLISTED,
    PIPELINE_STAGES.COUNSELLING,
    PIPELINE_STAGES.SHORTLISTED,
    PIPELINE_STAGES.APPLICATION_SUBMITTED,
  ];

  const results = await Promise.all(
    targetStages.map((target) =>
      jsonRequest(
        'PATCH',
        `/api/v1/pipeline/${student._id}/stage`,
        { stage: target, expectedStage: PIPELINE_STAGES.NEW_ENQUIRY },
        token
      )
    )
  );

  const successes = results.filter((r) => r.status === 200);
  const conflicts = results.filter((r) => r.status === 409);

  // Exactly ONE request must successfully transition from NEW_ENQUIRY
  assert.strictEqual(successes.length, 1, 'Exactly one concurrent transition must succeed from initial stage');
  assert.strictEqual(conflicts.length, 4, 'Remaining 4 conflicting concurrent requests must receive 409 Conflict');

  for (const c of conflicts) {
    assert.match(c.body.message, /conflict/i);
  }

  // Audit history must contain exactly 1 entry and no corrupted/overwritten history
  const fresh = await PipelineStudent.findById(student._id);
  assert.strictEqual(fresh.stageHistory.length, 1);
  assert.strictEqual(fresh.stageHistory[0].fromStage, PIPELINE_STAGES.NEW_ENQUIRY);
  assert.strictEqual(fresh.stage, successes[0].body.student.stage);
});

test('SEC-07.5: Concurrent document un-verification atomically blocks moving to Application Submitted', async () => {
  const manager = await User.create({
    name: 'Branch Manager Eve',
    email: 'manager.eve@test.local',
    password: 'Password123!',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.BENGALURU,
  });
  const token = signTestToken(manager);

  const student = await PipelineStudent.create({
    studentName: 'Sanjay Reddy',
    email: 'sanjay.reddy@test.local',
    programme: 'MS Robotics',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.SHORTLISTED,
    documentsVerified: true, // starts true
  });

  // Simultaneously un-verify documents and try to advance to APPLICATION_SUBMITTED
  const [unverifyRes, advanceRes] = await Promise.all([
    jsonRequest(
      'PATCH',
      `/api/v1/pipeline/${student._id}/documents`,
      { documentsVerified: false },
      token
    ),
    jsonRequest(
      'PATCH',
      `/api/v1/pipeline/${student._id}/stage`,
      { stage: PIPELINE_STAGES.APPLICATION_SUBMITTED },
      token
    ),
  ]);

  assert.strictEqual(unverifyRes.status, 200);

  // If unverify completed first or during update, advance to APPLICATION_SUBMITTED must NOT succeed with unverified documents
  const fresh = await PipelineStudent.findById(student._id);
  if (!fresh.documentsVerified) {
    assert.notStrictEqual(
      fresh.stage,
      PIPELINE_STAGES.APPLICATION_SUBMITTED,
      'Student with unverified documents must NEVER end up in APPLICATION_SUBMITTED'
    );
  }
});

test('SEC-07.6: Branch isolation prevents modifying pipeline student from another branch', async () => {
  const mysuruCounsellor = await User.create({
    name: 'Counsellor Mysuru',
    email: 'counsellor.mysuru@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.MYSURU,
  });
  const token = signTestToken(mysuruCounsellor);

  const bengaluruStudent = await PipelineStudent.create({
    studentName: 'Bengaluru Student',
    email: 'bengaluru.student@test.local',
    programme: 'BSc Psychology',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.NEW_ENQUIRY,
  });

  const res = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${bengaluruStudent._id}/stage`,
    { stage: PIPELINE_STAGES.COUNSELLING },
    token
  );

  assert.strictEqual(res.status, 403, 'Cross-branch modification must be rejected with 403');
  assert.match(res.body.message, /Unauthorized/i);
});

// ============================================================================
// SEC-08: Developer Setup Key Constant-Time Verification Tests
// ============================================================================

test('SEC-08.1: Constant-time comparison safely verifies valid developer setup key', async () => {
  const res = await jsonRequest('POST', '/api/v1/auth/setup-super-admin', {
    name: 'Super Admin Person',
    email: 'superadmin.sec08@test.local',
    password: 'SuperAdminPassword123!',
    developerKey: DEV_KEY,
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.role, ROLES.SUPER_ADMIN);
});

test('SEC-08.2: Constant-time comparison safely rejects invalid developer keys of differing lengths without errors', async () => {
  const invalidKeys = [
    'a',
    'short',
    'wrong_developer_key_2026',
    'a'.repeat(64),
    'b'.repeat(128),
    '   ',
  ];

  for (const badKey of invalidKeys) {
    const res = await jsonRequest('POST', '/api/v1/auth/setup-super-admin', {
      name: 'Intruder',
      email: 'intruder@test.local',
      password: 'Password123!',
      developerKey: badKey,
    });

    assert.strictEqual(res.status, 403, `Must reject bad key '${badKey.slice(0, 10)}...' with 403`);
    assert.strictEqual(res.body.message.includes(DEV_KEY), false, 'Must never leak secret in error response');
  }
});

test('SEC-08.3: Non-string developerKey inputs (numbers, objects, null) are safely rejected with 403 without crashing', async () => {
  const nonStringInputs = [12345, { secret: 'evil' }, [1, 2, 3], true];

  for (const invalidInput of nonStringInputs) {
    const res = await jsonRequest('POST', '/api/v1/auth/setup-super-admin', {
      name: 'Fuzzer',
      email: 'fuzzer@test.local',
      password: 'Password123!',
      developerKey: invalidInput,
    });

    assert.strictEqual(res.status, 403, 'Non-string developerKey must return 403');
  }
});

test('SEC-08.4: Missing DEVELOPER_SETUP_KEY environment variable fails closed with HTTP 500', async () => {
  const origKey = process.env.DEVELOPER_SETUP_KEY;
  delete process.env.DEVELOPER_SETUP_KEY;

  try {
    const res = await jsonRequest('POST', '/api/v1/auth/setup-super-admin', {
      name: 'Super Admin',
      email: 'superadmin.failclosed@test.local',
      password: 'Password123!',
      developerKey: DEV_KEY,
    });

    assert.strictEqual(res.status, 500);
    assert.match(res.body.message, /DEVELOPER_SETUP_KEY is not configured/i);
  } finally {
    process.env.DEVELOPER_SETUP_KEY = origKey;
  }
});

// ============================================================================
// SEC-09: Unthrottled Token Refresh Endpoint Tests
// ============================================================================

test('SEC-09.1: Valid token refresh succeeds within rate limit bounds', async () => {
  const user = await User.create({
    name: 'Refresh User',
    email: 'refresh.user@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 0,
  });

  const refreshToken = jwt.sign(
    { id: user._id, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const res = await jsonRequest('POST', '/api/v1/auth/refresh', { refreshToken });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.message, 'Token refreshed successfully');
  assert.ok(res.body.token, 'New access token returned');
});

test('SEC-09.2: Invalid refresh tokens are safely rejected with 401 without crashing', async () => {
  const res = await jsonRequest('POST', '/api/v1/auth/refresh', {
    refreshToken: 'invalid.bogus.jwt.token',
  });

  assert.strictEqual(res.status, 401);
  assert.match(res.body.message, /Invalid or expired refresh token/i);
});

test('SEC-09.3: Dedicated refreshLimiter enforces rate limiting with HTTP 429 when threshold exceeded', async () => {
  const user = await User.create({
    name: 'Rate Limit User',
    email: 'ratelimit.user@test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 0,
  });

  const refreshToken = jwt.sign(
    { id: user._id, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // We set SHIELD_REFRESH_MAX = 5 for this test suite.
  // Tests 9.1 and 9.2 consumed 2 requests.
  // Next 3 requests reach the ceiling of 5.
  for (let i = 0; i < 3; i++) {
    const res = await jsonRequest('POST', '/api/v1/auth/refresh', { refreshToken });
    assert.strictEqual(res.status, 200, `Request ${i + 1} within quota should succeed`);
  }

  // 6th request (overall) must be blocked by refreshLimiter with HTTP 429
  const blockedRes = await jsonRequest('POST', '/api/v1/auth/refresh', { refreshToken });

  assert.strictEqual(blockedRes.status, 429, 'Excess request must be rejected with HTTP 429 Rate Limit Exceeded');
  assert.strictEqual(blockedRes.body.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(blockedRes.body.retryAfter > 0, 'Must include retryAfter value');
});
