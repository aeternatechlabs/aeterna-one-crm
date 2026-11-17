/**
 * OpenCode Independent Security Tests — Auth, JWT & Registration (Real HTTP)
 * Runs the actual Express app over an ephemeral loopback listener against a
 * dedicated test database. Never touches the development database.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'opencode-independent-test-secret-9f8e7d6c';
process.env.MONGO_URI = TEST_MONGO_URI;
delete process.env.CLIENT_URL;
delete process.env.FRONTEND_URL;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');

let server;
let baseUrl;
let superToken;
let counsellorToken;
let marketingToken;

const api = async (method, path, { token, body, headers = {} } = {}) => {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* non-JSON body */
  }
  return { status: res.status, body: json, headers: res.headers };
};

const loginAs = async (email, password) => {
  const res = await api('POST', '/api/v1/auth/login', { body: { email, password } });
  assert.equal(res.status, 200, `login for ${email} must succeed`);
  return res.body.token;
};

before(async () => {
  assert.ok(
    process.env.MONGO_URI.includes('_test'),
    'SAFETY: tests must target a *_test database only'
  );
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  await User.create([
    {
      name: 'OC Super Admin',
      email: 'oc.super@test.local',
      password: 'Password@123',
      role: 'super_admin',
      branch: 'all',
    },
    {
      name: 'OC Counsellor',
      email: 'oc.counsellor@test.local',
      password: 'Password@123',
      role: 'counsellor',
      branch: 'bengaluru',
    },
    {
      name: 'OC Marketing',
      email: 'oc.marketing@test.local',
      password: 'Password@123',
      role: 'marketing',
      branch: 'bengaluru',
    },
  ]);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  superToken = await loginAs('oc.super@test.local', 'Password@123');
  counsellorToken = await loginAs('oc.counsellor@test.local', 'Password@123');
  marketingToken = await loginAs('oc.marketing@test.local', 'Password@123');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('login returns token in body, user object without password, and httpOnly cookie', async () => {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { email: 'oc.counsellor@test.local', password: 'Password@123' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.token === 'string' && res.body.token.length > 20, 'token present in body');
  assert.ok(res.body.user, 'user present');
  assert.equal(res.body.user.password, undefined, 'password must never be serialized');
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const accessCookie = cookies.find((c) => c.startsWith('accessToken='));
  assert.ok(accessCookie, 'accessToken cookie set');
  assert.match(accessCookie, /HttpOnly/i, 'accessToken cookie is httpOnly');
});

test('login rejects wrong password with 401 and generic message', async () => {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { email: 'oc.counsellor@test.local', password: 'WrongPassword1' },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Invalid email or password.');
});

test('login rejects unknown email with the same 401 message (no user enumeration)', async () => {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { email: 'nobody.here@test.local', password: 'Password@123' },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Invalid email or password.');
});

test('login rejects malformed email with 400 validation error', async () => {
  const res = await api('POST', '/api/v1/auth/login', {
    body: { email: 'not-an-email', password: 'Password@123' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('login rejects deactivated account with 403', async () => {
  const temp = await User.create({
    name: 'OC Inactive',
    email: 'oc.inactive@test.local',
    password: 'Password@123',
    role: 'counsellor',
    branch: 'bengaluru',
    isActive: true,
  });
  const token = await loginAs('oc.inactive@test.local', 'Password@123');
  await User.updateOne({ _id: temp._id }, { isActive: false });

  const loginRes = await api('POST', '/api/v1/auth/login', {
    body: { email: 'oc.inactive@test.local', password: 'Password@123' },
  });
  assert.equal(loginRes.status, 403);
  assert.match(loginRes.body.message, /deactivated/i);

  const meRes = await api('GET', '/api/v1/auth/me', { token });
  assert.equal(meRes.status, 403, 'existing token of deactivated user is rejected');

  await User.deleteOne({ _id: temp._id });
});

test('GET /me without token returns 401', async () => {
  const res = await api('GET', '/api/v1/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('GET /me with garbage token returns 401', async () => {
  const res = await api('GET', '/api/v1/auth/me', { token: 'this.is.not.a.jwt' });
  assert.equal(res.status, 401);
});

test('GET /me with token signed by a different secret returns 401', async () => {
  const forged = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'super_admin' },
    'attacker-controlled-secret',
    { expiresIn: '1d' }
  );
  const res = await api('GET', '/api/v1/auth/me', { token: forged });
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Invalid authentication token');
});

test('GET /me with expired token returns 401 with expiry message', async () => {
  const expired = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'super_admin' },
    process.env.JWT_SECRET,
    { expiresIn: '-10s' }
  );
  const res = await api('GET', '/api/v1/auth/me', { token: expired });
  assert.equal(res.status, 401);
  assert.match(res.body.message, /expired/i);
});

test('GET /me with alg:none unsigned token returns 401 (no algorithm confusion)', async () => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    id: new mongoose.Types.ObjectId().toString(),
    role: 'super_admin',
  })}.`;
  const res = await api('GET', '/api/v1/auth/me', { token: unsigned });
  assert.equal(res.status, 401, 'alg:none token must be rejected');
});

test('GET /me with tampered payload (role escalated) but original signature returns 401', async () => {
  const valid = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'counsellor' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  const [h, , s] = valid.split('.');
  const escalated = Buffer.from(
    JSON.stringify({ id: new mongoose.Types.ObjectId().toString(), role: 'super_admin' })
  ).toString('base64url');
  const res = await api('GET', '/api/v1/auth/me', { token: `${h}.${escalated}.${s}` });
  assert.equal(res.status, 401);
});

test('GET /me with valid token returns profile without password', async () => {
  const res = await api('GET', '/api/v1/auth/me', { token: superToken });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'super_admin');
  assert.equal(res.body.user.password, undefined);
});

test('GET /me works via httpOnly cookie as well as Bearer header', async () => {
  const res = await fetch(baseUrl + '/api/v1/auth/me', {
    headers: { Cookie: `accessToken=${superToken}` },
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.user.email, 'oc.super@test.local');
});

test('GET /me for a deleted user returns 401 (valid token, missing account)', async () => {
  const ghost = await User.create({
    name: 'OC Ghost',
    email: 'oc.ghost@test.local',
    password: 'Password@123',
    role: 'counsellor',
    branch: 'bengaluru',
  });
  const ghostToken = await loginAs('oc.ghost@test.local', 'Password@123');
  await User.deleteOne({ _id: ghost._id });
  const res = await api('GET', '/api/v1/auth/me', { token: ghostToken });
  assert.equal(res.status, 401);
  assert.match(res.body.message, /no longer exists/i);
});

test('POST /register without token returns 401 (route is not public)', async () => {
  const res = await api('POST', '/api/v1/auth/register', {
    body: {
      name: 'Sneaky Pete',
      email: 'oc.sneaky@test.local',
      password: 'Password@123',
      role: 'super_admin',
      branch: 'all',
    },
  });
  assert.equal(res.status, 401);
  const exists = await User.findOne({ email: 'oc.sneaky@test.local' });
  assert.equal(exists, null, 'no user created by anonymous register attempt');
});

test('POST /register with non-super-admin token returns 403 for every other role', async () => {
  for (const [token, label] of [
    [counsellorToken, 'counsellor'],
    [marketingToken, 'marketing'],
  ]) {
    const res = await api('POST', '/api/v1/auth/register', {
      token,
      body: {
        name: 'Escalated User',
        email: `oc.escalate.${label}@test.local`,
        password: 'Password@123',
        role: 'super_admin',
        branch: 'all',
      },
    });
    assert.equal(res.status, 403, `${label} must be forbidden from provisioning staff`);
    const exists = await User.findOne({ email: `oc.escalate.${label}@test.local` });
    assert.equal(exists, null, `no user created via ${label} register attempt`);
  }
});

test('POST /register as super_admin provisions staff without password in response', async () => {
  const res = await api('POST', '/api/v1/auth/register', {
    token: superToken,
    body: {
      name: 'OC Provisioned Officer',
      email: 'oc.officer@test.local',
      password: 'Password@123',
      role: 'application_officer',
      branch: 'bengaluru',
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.password, undefined, 'password not serialized');
  assert.equal(res.body.user.role, 'application_officer');
  const stored = await User.findOne({ email: 'oc.officer@test.local' }).select('+password');
  assert.ok(stored, 'user persisted');
  assert.notEqual(stored.password, 'Password@123', 'password stored hashed');
});

test('POST /register rejects duplicate email with 409', async () => {
  const res = await api('POST', '/api/v1/auth/register', {
    token: superToken,
    body: {
      name: 'OC Duplicate',
      email: 'oc.officer@test.local',
      password: 'Password@123',
      role: 'counsellor',
      branch: 'bengaluru',
    },
  });
  assert.equal(res.status, 409);
});

test('POST /register rejects non-super-admin role assigned to branch "all" with 400', async () => {
  const res = await api('POST', '/api/v1/auth/register', {
    token: superToken,
    body: {
      name: 'OC Global Counsellor',
      email: 'oc.globalc@test.local',
      password: 'Password@123',
      role: 'counsellor',
      branch: 'all',
    },
  });
  assert.equal(res.status, 400);
  const exists = await User.findOne({ email: 'oc.globalc@test.local' });
  assert.equal(exists, null, 'branch=all counsellor must not be provisioned');
});

test('POST /register rejects invalid role, invalid branch and short password with 400', async () => {
  const base = {
    name: 'OC Invalid Cases',
    email: 'oc.invalid@test.local',
    password: 'Password@123',
    role: 'counsellor',
    branch: 'bengaluru',
  };
  const badRole = await api('POST', '/api/v1/auth/register', {
    token: superToken,
    body: { ...base, role: 'root' },
  });
  assert.equal(badRole.status, 400);

  const badBranch = await api('POST', '/api/v1/auth/register', {
    token: superToken,
    body: { ...base, branch: 'nowhere' },
  });
  assert.equal(badBranch.status, 400);

  const shortPassword = await api('POST', '/api/v1/auth/register', {
    token: superToken,
    body: { ...base, password: 'abc' },
  });
  assert.equal(shortPassword.status, 400);

  const exists = await User.findOne({ email: 'oc.invalid@test.local' });
  assert.equal(exists, null, 'invalid register payloads must not create users');
});

test('missing JWT_SECRET fails closed with 500 on protected routes', async () => {
  const saved = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    const res = await api('GET', '/api/v1/auth/me', { token: superToken });
    assert.equal(res.status, 500);
    assert.match(res.body.message, /JWT_SECRET is not configured/);
    assert.equal(res.body.stack, undefined, 'no stack trace outside development');
  } finally {
    process.env.JWT_SECRET = saved;
  }
});

test('POST /logout succeeds without authentication and clears cookies', async () => {
  const res = await api('POST', '/api/v1/auth/logout');
  assert.equal(res.status, 200);
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  assert.ok(cookies.some((c) => c.startsWith('accessToken=;') || c.includes('accessToken=;')), 'accessToken cleared');
});

test('POST /refresh with valid cookie returns 200, refreshed token and sets fresh cookies', async () => {
  const loginRes = await api('POST', '/api/v1/auth/login', {
    body: { email: 'oc.counsellor@test.local', password: 'Password@123' },
  });
  assert.equal(loginRes.status, 200);
  const cookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
  assert.ok(refreshCookie, 'refreshToken cookie received from login');
  const cookieVal = refreshCookie.split(';')[0];

  const refreshRes = await api('POST', '/api/v1/auth/refresh', {
    headers: { Cookie: cookieVal },
  });
  assert.equal(refreshRes.status, 200);
  assert.equal(refreshRes.body.success, true);
  assert.ok(typeof refreshRes.body.token === 'string' && refreshRes.body.token.length > 20);
  assert.ok(refreshRes.body.user);
  assert.equal(refreshRes.body.user.password, undefined);

  const newCookies = refreshRes.headers.getSetCookie ? refreshRes.headers.getSetCookie() : [];
  assert.ok(newCookies.some((c) => c.startsWith('accessToken=')), 'new accessToken cookie set');
});

test('POST /refresh without refresh token returns 401', async () => {
  const res = await api('POST', '/api/v1/auth/refresh');
  assert.equal(res.status, 401);
  assert.match(res.body.message, /refresh token/i);
});

test('POST /refresh with invalid or expired token returns 401', async () => {
  const res = await api('POST', '/api/v1/auth/refresh', {
    headers: { Cookie: 'refreshToken=malformed.garbage.token' },
  });
  assert.equal(res.status, 401);
  assert.match(res.body.message, /invalid or expired/i);
});

test('POST /refresh for deactivated account returns 403', async () => {
  const deactUser = await User.create({
    name: 'OC Refresh Deact',
    email: 'oc.refresh.deact@test.local',
    password: 'Password@123',
    role: 'counsellor',
    branch: 'bengaluru',
    isActive: false,
  });
  const jwtSecret = process.env.JWT_SECRET;
  const token = jwt.sign({ id: deactUser._id }, jwtSecret, { expiresIn: '7d' });

  const res = await api('POST', '/api/v1/auth/refresh', {
    headers: { Cookie: `refreshToken=${token}` },
  });
  assert.equal(res.status, 403);
  assert.match(res.body.message, /deactivated/i);
});
