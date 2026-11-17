/**
 * Batch 1: Critical Security Hardening Tests (SEC-01 to SEC-03)
 *
 * Verifies:
 * - SEC-01: Super Admin Provisioning Race Condition & MongoDB Partial Unique Index
 * - SEC-02: Elimination of Hardcoded Developer Setup Secret & Fail-Closed Constant-Time Auth
 * - SEC-03: Account-Level Brute-Force Protection (5 failed attempts -> 15 min lock, atomic concurrency)
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_batch1_sec';
const VALID_DEV_KEY = 'batch1_audit_secret_dev_key_2026';
const JWT_SECRET = 'batch1_audit_jwt_secret_key_2026';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGO_URI = TEST_MONGO_URI;
process.env.DEVELOPER_SETUP_KEY = VALID_DEV_KEY;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const { ROLES, BRANCHES } = require('../src/config/constants');

let server;
let baseUrl;

const fetchApi = (endpointPath, opts = {}) => fetch(baseUrl + endpointPath, opts);

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  await User.init(); // Build declared schema indexes including unique_super_admin_role

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

// ============================================================================
// SEC-01: Super Admin Provisioning Race Condition & Partial Unique Index
// ============================================================================

test('SEC-01.1: MongoDB partial unique index unique_super_admin_role is active on User collection', async () => {
  const indexes = await User.collection.indexes();
  const superAdminIndex = indexes.find((idx) => idx.name === 'unique_super_admin_role');

  assert.ok(superAdminIndex, 'Index unique_super_admin_role must exist in collection indexes');
  assert.strictEqual(superAdminIndex.unique, true, 'Index must enforce uniqueness');
  assert.deepStrictEqual(
    superAdminIndex.partialFilterExpression,
    { role: ROLES.SUPER_ADMIN },
    'Index must have partialFilterExpression targeting super_admin role only'
  );
});

test('SEC-01.2: Database constraint prevents creating multiple super_admin records even via direct insert', async () => {
  await User.create({
    name: 'First Super Admin',
    email: 'first.super@aeterna.com',
    password: 'Password@123',
    role: ROLES.SUPER_ADMIN,
    branch: BRANCHES.ALL,
  });

  await assert.rejects(
    async () => {
      await User.create({
        name: 'Second Super Admin',
        email: 'second.super@aeterna.com',
        password: 'Password@123',
        role: ROLES.SUPER_ADMIN,
        branch: BRANCHES.ALL,
      });
    },
    (err) => {
      assert.strictEqual(err.code, 11000, 'Must throw Mongo duplicate key error 11000');
      return true;
    }
  );
});

test('SEC-01.3: Partial unique index allows creating multiple non-super_admin users without collision', async () => {
  const counsellor1 = await User.create({
    name: 'Counsellor One',
    email: 'counsellor1@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  const counsellor2 = await User.create({
    name: 'Counsellor Two',
    email: 'counsellor2@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  assert.ok(counsellor1._id);
  assert.ok(counsellor2._id);
  assert.strictEqual(counsellor1.role, ROLES.COUNSELLOR);
  assert.strictEqual(counsellor2.role, ROLES.COUNSELLOR);
});

test('SEC-01.4: Concurrent HTTP requests to /setup-super-admin result in exactly ONE Super Admin created', async () => {
  const concurrentRequests = 10;
  const promises = [];

  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      fetchApi('/api/v1/auth/setup-super-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-developer-key': VALID_DEV_KEY,
        },
        body: JSON.stringify({
          name: `Concurrent Admin ${i}`,
          email: `concurrent.admin${i}@aeterna.com`,
          password: 'Password@123',
        }),
      })
    );
  }

  const responses = await Promise.all(promises);
  const results = await Promise.all(
    responses.map(async (res) => ({
      status: res.status,
      body: await res.json(),
    }))
  );

  const successes = results.filter((r) => r.status === 201);
  const rejections = results.filter((r) => r.status === 403);

  assert.strictEqual(successes.length, 1, 'Exactly ONE request must succeed with 201 Created');
  assert.strictEqual(
    rejections.length,
    concurrentRequests - 1,
    `All other ${concurrentRequests - 1} requests must be rejected with 403 Forbidden`
  );

  for (const rejected of rejections) {
    assert.strictEqual(rejected.body.success, false);
    assert.ok(
      rejected.body.message.includes('ONE Super Admin') || rejected.body.message.includes('throne is already claimed'),
      'Must return controlled creative error response'
    );
  }

  const superAdminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN });
  assert.strictEqual(superAdminCount, 1, 'Database must contain exactly 1 Super Admin document');
});

// ============================================================================
// SEC-02: Hardcoded Developer Setup Secret & Fail-Closed Constant-Time Auth
// ============================================================================

test('SEC-02.1: Zero occurrences of hardcoded fallback secret in server source code', () => {
  const serverSrcDir = path.resolve(__dirname, '../src');

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          !content.includes('aeterna_dev_secret_key_2026_super_admin_setup'),
          `Hardcoded fallback developer key found in ${fullPath}`
        );
      }
    }
  }

  scanDir(serverSrcDir);
});

test('SEC-02.2: Missing DEVELOPER_SETUP_KEY environment variable fails-closed with 500 error', async () => {
  delete process.env.DEVELOPER_SETUP_KEY;

  const res = await fetchApi('/api/v1/auth/setup-super-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': VALID_DEV_KEY,
    },
    body: JSON.stringify({
      name: 'Unconfigured Admin',
      email: 'unconfigured@aeterna.com',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(res.status, 500, 'Must fail-closed with 500 when DEVELOPER_SETUP_KEY is unconfigured');
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.ok(
    body.message.includes('DEVELOPER_SETUP_KEY is not configured') || body.code === 'INTERNAL_SERVER_ERROR',
    'Must refuse provisioning safely without exposing secrets'
  );
});

test('SEC-02.3: Constant-time comparison safely rejects invalid developer keys of varying lengths', async () => {
  const invalidKeys = [
    'short',
    'wrong_length_test_dev_key_1234567890',
    VALID_DEV_KEY.slice(0, -1) + 'X', // Same length, 1 char difference
    '',
    ' ',
  ];

  for (const badKey of invalidKeys) {
    const res = await fetchApi('/api/v1/auth/setup-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-developer-key': badKey,
      },
      body: JSON.stringify({
        name: 'Sherlock Wannabe',
        email: 'sherlock@aeterna.com',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 403, `Bad key '${badKey}' must be rejected with 403`);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(
      body.message.includes('Sherlock') || body.message.includes('Developer Key'),
      'Must return funny Sherlock rejection message'
    );
  }
});

// ============================================================================
// SEC-03: Account-Level Brute-Force Protection
// ============================================================================

test('SEC-03.1: Five consecutive failed logins trigger a 15-minute account lock; subsequent attempts rejected with 423', async () => {
  const user = await User.create({
    name: 'Brute Target User',
    email: 'target.user@aeterna.com',
    password: 'CorrectPassword@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  // Attempts 1 to 5: send wrong passwords
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetchApi('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'target.user@aeterna.com',
        password: `WrongPassword#${attempt}`,
      }),
    });

    assert.strictEqual(res.status, 401, `Failed attempt ${attempt} must return 401`);
    const data = await res.json();
    assert.strictEqual(data.message, 'Invalid email or password.');
  }

  // Verify database state: failedLoginAttempts is 5, lockUntil is set in future
  const lockedUser = await User.findById(user._id);
  assert.strictEqual(lockedUser.failedLoginAttempts, 5, 'failedLoginAttempts must be 5');
  assert.ok(lockedUser.lockUntil, 'lockUntil must be set');
  const lockRemainingMs = lockedUser.lockUntil.getTime() - Date.now();
  assert.ok(lockRemainingMs > 13 * 60 * 1000, 'Lock duration must be ~15 minutes');

  // Attempt 6 (further attempt): rejected with 423 Locked
  const attempt6 = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'target.user@aeterna.com',
      password: 'WrongPassword#6',
    }),
  });

  assert.strictEqual(attempt6.status, 423, 'Attempt during lock must return 423 Locked');
  const data6 = await attempt6.json();
  assert.ok(data6.message.includes('temporarily locked'), 'Message must indicate temporary lockout');

  // Attempt 7: Entering CORRECT password while locked is STILL rejected with 423
  const attempt7 = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'target.user@aeterna.com',
      password: 'CorrectPassword@123',
    }),
  });

  assert.strictEqual(attempt7.status, 423, 'Correct password during lock period must still be rejected with 423');
});

test('SEC-03.2: Successful login resets failed login counters and updates lastLogin', async () => {
  await User.create({
    name: 'Reset Test User',
    email: 'reset.user@aeterna.com',
    password: 'CorrectPassword@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    failedLoginAttempts: 3, // simulate 3 previous failed attempts
  });

  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'reset.user@aeterna.com',
      password: 'CorrectPassword@123',
    }),
  });

  assert.strictEqual(res.status, 200, 'Valid login must return 200');
  const body = await res.json();
  assert.ok(body.token, 'Must return JWT token');

  const userInDb = await User.findOne({ email: 'reset.user@aeterna.com' });
  assert.strictEqual(userInDb.failedLoginAttempts, 0, 'failedLoginAttempts must be reset to 0');
  assert.strictEqual(userInDb.lockUntil, null, 'lockUntil must be null');
  assert.ok(userInDb.lastLogin, 'lastLogin timestamp must be recorded');
});

test('SEC-03.3: Expired lockout allows legitimate user to log in and clears lock state', async () => {
  await User.create({
    name: 'Expired Lock User',
    email: 'expired.lock@aeterna.com',
    password: 'CorrectPassword@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    failedLoginAttempts: 5,
    lockUntil: new Date(Date.now() - 30 * 1000), // Lock expired 30 seconds ago
  });

  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'expired.lock@aeterna.com',
      password: 'CorrectPassword@123',
    }),
  });

  assert.strictEqual(res.status, 200, 'Expired lock must permit login with valid password');
  const userInDb = await User.findOne({ email: 'expired.lock@aeterna.com' });
  assert.strictEqual(userInDb.failedLoginAttempts, 0, 'failedLoginAttempts must be reset to 0');
  assert.strictEqual(userInDb.lockUntil, null, 'lockUntil must be null');
});

test('SEC-03.4: Concurrent failed password attempts atomically lock account without race conditions', async () => {
  await User.create({
    name: 'Concurrent Brute User',
    email: 'concurrent.brute@aeterna.com',
    password: 'CorrectPassword@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });

  // Fire 10 concurrent requests with wrong password
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetchApi('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'concurrent.brute@aeterna.com',
          password: `BadPassword#${i}`,
        }),
      })
    );
  }

  const responses = await Promise.all(promises);
  const statuses = responses.map((r) => r.status);

  // All 10 requests must be rejected (either 401 password mismatch or 423 locked)
  for (const status of statuses) {
    assert.ok(status === 401 || status === 423, `Status must be 401 or 423, got ${status}`);
  }

  // Verify that the account is locked in the database
  const userInDb = await User.findOne({ email: 'concurrent.brute@aeterna.com' });
  assert.ok(userInDb.failedLoginAttempts >= 5, 'failedLoginAttempts must be >= 5');
  assert.ok(userInDb.lockUntil, 'lockUntil must be set');
  assert.ok(userInDb.lockUntil.getTime() > Date.now(), 'lockUntil must be in the future');
});

test('SEC-03.5: Non-existent email returns identical 401 error as wrong password (no user enumeration)', async () => {
  const res = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent.ghost.user@aeterna.com',
      password: 'SomePassword@123',
    }),
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(
    data.message,
    'Invalid email or password.',
    'Must return generic invalid email or password message'
  );
});
