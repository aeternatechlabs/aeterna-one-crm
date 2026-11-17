/**
 * Day 5: Super Admin One-Time Provisioning & Developer Key Security Guard Tests
 *
 * Verifies:
 * 1. POST /api/v1/auth/setup-super-admin rejects missing Developer Key with 403 and funny message
 * 2. POST /api/v1/auth/setup-super-admin rejects invalid Developer Key with 403 and funny message
 * 3. POST /api/v1/auth/setup-super-admin creates initial Super Admin when valid Developer Key is provided
 * 4. Subsequent attempt to create another Super Admin is blocked with 403 and funny message (duplicate check)
 * 5. POST /api/v1/auth/register rejects attempt to provision a second Super Admin with 403 and funny message
 * 6. POST /api/v1/auth/register allows Super Admin to provision normal staff (counsellor) with 201
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_superadmin';
const DEV_KEY = 'test_dev_secret_key_super_admin_2026';
const JWT_SECRET = 'test_super_admin_security_jwt_secret_2026';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGO_URI = TEST_MONGO_URI;
process.env.DEVELOPER_SETUP_KEY = DEV_KEY;

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

test('1. POST /setup-super-admin without Developer Key is rejected with 403 and funny message', async () => {
  const res = await fetchApi('/api/v1/auth/setup-super-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Wannabe Admin',
      email: 'wannabe@test.local',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes('Sherlock') || data.message.includes('Developer Key'), 'Must contain funny message');
});

test('2. POST /setup-super-admin with invalid Developer Key is rejected with 403 and funny message', async () => {
  const res = await fetchApi('/api/v1/auth/setup-super-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': 'wrong_fake_key_123',
    },
    body: JSON.stringify({
      name: 'Hacker Admin',
      email: 'hacker@test.local',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes('Sherlock') || data.message.includes('Developer Key'), 'Must contain funny English line');
});

test('3. POST /setup-super-admin with valid Developer Key creates the first Super Admin', async () => {
  const res = await fetchApi('/api/v1/auth/setup-super-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': DEV_KEY,
    },
    body: JSON.stringify({
      name: 'Original Boss',
      email: 'superadmin.og@aeterna.com',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  const user = data.user || (data.data && data.data.user);
  assert.ok(user, 'User must be returned in response');
  assert.strictEqual(user.email, 'superadmin.og@aeterna.com');
  assert.strictEqual(user.role, ROLES.SUPER_ADMIN);
  assert.strictEqual(user.branch, BRANCHES.ALL);
  assert.strictEqual(user.password, undefined, 'Password must not be in response');
});

test('4. POST /setup-super-admin duplicate attempt is rejected with 403 and funny message', async () => {
  const res = await fetchApi('/api/v1/auth/setup-super-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': DEV_KEY,
    },
    body: JSON.stringify({
      name: 'Duplicate Boss',
      email: 'duplicate.boss@aeterna.com',
      password: 'Password@123',
    }),
  });

  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(
    data.message.includes('ONE Super Admin') || data.message.includes('Duplicate Super Admin'),
    'Must reject duplicate with funny one-boss message'
  );
});

test('5. POST /register as super_admin attempting to create a second super_admin is rejected with 403 and funny message', async () => {
  // Create a token for the existing super admin
  const superUser = await User.findOne({ role: ROLES.SUPER_ADMIN });
  const token = jwt.sign(
    { id: superUser._id, role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const res = await fetchApi('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Second Super Admin',
      email: 'second.super@aeterna.com',
      password: 'Password@123',
      role: ROLES.SUPER_ADMIN,
      branch: BRANCHES.ALL,
    }),
  });

  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(
    data.message.includes('Duplicate Super Admin') || data.message.includes('ONE Super Admin'),
    'Must reject duplicate super admin creation'
  );
});

test('6. POST /register as super_admin provisioning regular staff (counsellor) succeeds with 201', async () => {
  const superUser = await User.findOne({ role: ROLES.SUPER_ADMIN });
  const token = jwt.sign(
    { id: superUser._id, role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const res = await fetchApi('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Valid Counsellor',
      email: 'valid.counsellor@aeterna.com',
      password: 'Password@123',
      role: ROLES.COUNSELLOR,
      branch: BRANCHES.BENGALURU,
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  const user = data.user || (data.data && data.data.user);
  assert.ok(user, 'User must be returned in response');
  assert.strictEqual(user.role, ROLES.COUNSELLOR);
  assert.strictEqual(user.email, 'valid.counsellor@aeterna.com');
});
