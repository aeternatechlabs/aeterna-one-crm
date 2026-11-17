/**
 * Batch 2: Critical Security Hardening Tests (SEC-04 to SEC-06)
 *
 * Verifies:
 * - SEC-04: Stateless Zombie JWT Sessions Post-Logout (tokenVersion revocation on logout & password change)
 * - SEC-05: Payload Shield Content-Type Enforcement (chunked & length payloads, 415 on missing/unsupported)
 * - SEC-06: Database Search Hardening (indexes, execution plans, term length bounds & pagination caps)
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_batch2_sec';
const JWT_SECRET = 'batch2_audit_jwt_secret_key_2026';
const DEV_KEY = 'batch2_dev_secret_key_2026';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGO_URI = TEST_MONGO_URI;
process.env.DEVELOPER_SETUP_KEY = DEV_KEY;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES, BRANCHES, PIPELINE_STAGES } = require('../src/config/constants');

let server;
let baseUrl;

const fetchApi = (endpointPath, opts = {}) => fetch(baseUrl + endpointPath, opts);

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
// SEC-04: Stateless Zombie JWT Sessions Post-Logout
// ============================================================================

test('SEC-04.1: Access token is invalidated immediately after logout via tokenVersion revocation', async () => {
  const user = await User.create({
    name: 'Zombie Test User',
    email: 'zombie.test@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 0,
  });

  // 1. Log in to acquire tokens
  const loginRes = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'zombie.test@aeterna.com',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert.ok(token, 'Must receive access token');

  // 2. Verified that access token works before logout
  const meBefore = await fetchApi('/api/v1/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(meBefore.status, 200, 'Token must work before logout');

  // 3. Log out with Bearer token
  const logoutRes = await fetchApi('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(logoutRes.status, 200);

  // 4. Verify tokenVersion was incremented in DB
  const userAfterLogout = await User.findById(user._id);
  assert.strictEqual(userAfterLogout.tokenVersion, 1, 'tokenVersion must be incremented to 1');

  // 5. Attempting to access protected endpoint with the old token MUST FAIL with 401
  const meAfter = await fetchApi('/api/v1/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(meAfter.status, 401, 'Previously issued access token must be rejected post-logout');
  const meAfterData = await meAfter.json();
  assert.ok(
    meAfterData.message.includes('revoked') || meAfterData.message.includes('expired'),
    'Must indicate revoked session'
  );
});

test('SEC-04.2: Refresh token is rejected after logout', async () => {
  const user = await User.create({
    name: 'Refresh Revoke User',
    email: 'refresh.revoke@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  // Sign tokens with current tokenVersion (0)
  const refreshToken = jwt.sign(
    { id: user._id, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Log out to increment tokenVersion to 1
  await fetchApi('/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  // Try refreshing with the old refresh token
  const refreshRes = await fetchApi('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  assert.strictEqual(refreshRes.status, 401, 'Old refresh token must be rejected after logout');
});

test('SEC-04.3: Password change invalidates existing sessions', async () => {
  const user = await User.create({
    name: 'Password Change User',
    email: 'pwd.change@aeterna.com',
    password: 'InitialPassword@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 0,
  });

  // Sign token with initial tokenVersion (0)
  const token = jwt.sign(
    { id: user._id, role: user.role, branch: user.branch, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Verify token works
  const me1 = await fetchApi('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(me1.status, 200);

  // Simulate password update
  user.password = 'NewSuperSecurePassword@456';
  await user.save();

  // Verify tokenVersion incremented on User document
  assert.strictEqual(user.tokenVersion, 1, 'tokenVersion must be incremented on password change');

  // Verify old token is now rejected with 401
  const me2 = await fetchApi('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(me2.status, 401, 'Old token must be rejected after password change');
});

test('SEC-04.4: New login generates tokens with updated tokenVersion that function properly', async () => {
  const user = await User.create({
    name: 'Relogin User',
    email: 'relogin@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 3, // existing elevated version
  });

  const loginRes = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'relogin@aeterna.com',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(loginRes.status, 200);
  const data = await loginRes.json();
  const decoded = jwt.decode(data.token);
  assert.strictEqual(decoded.tokenVersion, 3, 'New token must carry updated tokenVersion');

  const meRes = await fetchApi('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  assert.strictEqual(meRes.status, 200, 'New token must work for authenticated routes');
});

// ============================================================================
// SEC-05: Payload Shield Content-Type Enforcement
// ============================================================================

test('SEC-05.1: Requests with body payload but missing Content-Type are rejected with 415', async () => {
  const payload = '{"email":"test@test.com","password":"123"}';
  const res = await rawHttpRequest('POST', '/api/v1/auth/login', {
    'Content-Length': Buffer.byteLength(payload),
    // Intentionally omit Content-Type
  }, payload);

  assert.strictEqual(res.status, 415, 'Must reject payload with missing Content-Type header with 415');
  assert.strictEqual(res.body.code, 'UNSUPPORTED_FILE_TYPE');
});

test('SEC-05.2: Requests with unsupported Content-Type (text/xml, text/html) are rejected with 415', async () => {
  const res = await rawHttpRequest('POST', '/api/v1/auth/login', {
    'Content-Type': 'text/xml',
  }, '<user><email>test@test.com</email></user>');

  assert.strictEqual(res.status, 415, 'Must reject unsupported text/xml with 415');
});

test('SEC-05.3: Chunked requests without Content-Type or with invalid Content-Type are rejected with 415', async () => {
  const res = await rawHttpRequest('POST', '/api/v1/auth/login', {
    'Transfer-Encoding': 'chunked',
    'Content-Type': 'text/plain',
  }, 'chunked content');

  assert.strictEqual(res.status, 415, 'Must reject chunked request with unsupported Content-Type with 415');
});

test('SEC-05.4: Empty mutation requests (e.g. POST /logout without body) pass through cleanly', async () => {
  const res = await fetchApi('/api/v1/auth/logout', {
    method: 'POST',
  });

  assert.strictEqual(res.status, 200, 'Empty mutation requests without body must not be blocked by Content-Type guard');
});

test('SEC-05.5: Malformed JSON payload is intercepted and returns 400 INVALID_JSON', async () => {
  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"broken json: missing value',
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.code, 'INVALID_JSON');
});

// ============================================================================
// SEC-06: Database Search Hardening & Resource Protection
// ============================================================================

test('SEC-06.1: Search term exceeding 50 characters is rejected with 400 error', async () => {
  const counsellor = await User.create({
    name: 'Search Tester',
    email: 'search.tester@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  const token = jwt.sign(
    { id: counsellor._id, role: counsellor.role, branch: counsellor.branch, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const longSearch = 'A'.repeat(51);

  // Pipeline search
  const pipelineRes = await fetchApi(`/api/v1/pipeline?search=${longSearch}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(pipelineRes.status, 400, 'Oversized pipeline search query must be rejected with 400');
  const pipelineData = await pipelineRes.json();
  assert.ok(pipelineData.message.includes('50 characters'));

  // Users search
  const superUser = await User.create({
    name: 'Super User',
    email: 'super.user@aeterna.com',
    password: 'Password@123',
    role: ROLES.SUPER_ADMIN,
    branch: BRANCHES.ALL,
    tokenVersion: 0,
  });

  const superToken = jwt.sign(
    { id: superUser._id, role: superUser.role, branch: superUser.branch, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const usersRes = await fetchApi(`/api/v1/users?search=${longSearch}`, {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.strictEqual(usersRes.status, 400, 'Oversized user directory search query must be rejected with 400');
});

test('SEC-06.2: Pipeline search pagination limits results and prevents unbounded database queries', async () => {
  const counsellor = await User.create({
    name: 'Pagination Counsellor',
    email: 'pag.counsellor@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    tokenVersion: 0,
  });

  const token = jwt.sign(
    { id: counsellor._id, role: counsellor.role, branch: counsellor.branch, tokenVersion: 0 },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create 15 pipeline students
  const docs = [];
  for (let i = 1; i <= 15; i++) {
    docs.push({
      studentName: `Candidate ${i} Test`,
      email: `candidate${i}@test.com`,
      programme: 'Computer Science',
      university: 'Oxford',
      destination: 'United Kingdom',
      branch: BRANCHES.BENGALURU,
      stage: PIPELINE_STAGES.NEW_ENQUIRY,
    });
  }
  await PipelineStudent.insertMany(docs);

  // Query with limit=5
  const res = await fetchApi('/api/v1/pipeline?limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.students.length, 5, 'Must respect limit=5');

  // Query with safe bounded ceiling (?limit=999999 caps at 100)
  const resCeil = await fetchApi('/api/v1/pipeline?limit=999999', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(resCeil.status, 200);
  const dataCeil = await resCeil.json();
  assert.strictEqual(dataCeil.students.length, 15, 'Returns available records without exceeding ceiling');
});

test('SEC-06.3: Compound indexes and text indexes are declared and active on PipelineStudent & User collections', async () => {
  const pipelineIndexes = await PipelineStudent.collection.indexes();
  const pipelineTextIdx = pipelineIndexes.find((idx) => idx.name === 'pipeline_text_search');
  const pipelineBranchIdx = pipelineIndexes.find((idx) => idx.key && idx.key.branch === 1 && idx.key.updatedAt === -1);

  assert.ok(pipelineTextIdx, 'pipeline_text_search text index must exist');
  assert.ok(pipelineBranchIdx, 'Compound index on { branch: 1, updatedAt: -1 } must exist');

  const userIndexes = await User.collection.indexes();
  const userTextIdx = userIndexes.find((idx) => idx.name === 'users_text_search');
  const userBranchRoleIdx = userIndexes.find(
    (idx) => idx.key && idx.key.branch === 1 && idx.key.role === 1 && idx.key.createdAt === -1
  );

  assert.ok(userTextIdx, 'users_text_search text index must exist');
  assert.ok(userBranchRoleIdx, 'Compound index on { branch: 1, role: 1, createdAt: -1 } must exist');
});

test('SEC-06.4: Query execution plan uses index scan (IXSCAN) on branch filter rather than collection scan (COLLSCAN)', async () => {
  // Insert sample records
  const sampleDocs = [];
  for (let i = 0; i < 20; i++) {
    sampleDocs.push({
      studentName: `Student ${i}`,
      email: `student${i}@test.com`,
      programme: 'Economics',
      destination: 'United Kingdom',
      branch: i % 2 === 0 ? BRANCHES.BENGALURU : BRANCHES.MYSURU,
      stage: PIPELINE_STAGES.NEW_ENQUIRY,
    });
  }
  await PipelineStudent.insertMany(sampleDocs);

  // Explain query execution plan for scoped branch query
  const explainResult = await PipelineStudent.find({ branch: BRANCHES.BENGALURU })
    .sort({ updatedAt: -1 })
    .explain('executionStats');

  const stage = explainResult.executionStats.executionStages.stage;
  // Stage should be FETCH (following an IXSCAN), not a raw full COLLSCAN
  assert.ok(
    stage === 'FETCH' || stage === 'IXSCAN',
    `Execution plan must use index scan (FETCH/IXSCAN), got ${stage}`
  );
  assert.strictEqual(
    explainResult.executionStats.totalDocsExamined,
    10,
    'Must only examine documents belonging to the branch (10 out of 20)'
  );
});
