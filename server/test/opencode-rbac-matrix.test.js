/**
 * OpenCode Independent Security Tests — RBAC Matrix (Real HTTP)
 * Verifies every (role, protected endpoint) combination against the live
 * Express router: allowed roles succeed, forbidden roles get 403, anonymous
 * requests get 401. Dedicated test database, never the dev database.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_rbac';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'opencode-independent-test-secret-9f8e7d6c';
process.env.MONGO_URI = TEST_MONGO_URI;
delete process.env.CLIENT_URL;
delete process.env.FRONTEND_URL;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES } = require('../src/config/constants');

let server;
let baseUrl;
let studentId;
let registerCounter = 0;

const ROLES_ALL = [
  ROLES.SUPER_ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.COUNSELLOR,
  ROLES.APPLICATION_OFFICER,
  ROLES.MARKETING,
];

const tokens = {};

const emailFor = (role) => `oc.rbac.${role}@test.local`;

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
    /* non-JSON */
  }
  return { status: res.status, body: json };
};

const newStaffBody = (role) => ({
  name: `OC Matrix ${role}`,
  email: `oc.matrix.${role}@test.local`,
  password: 'Password@123',
  role,
  branch: 'bengaluru',
});

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  await User.create([
    { name: 'OC RBAC Super', email: emailFor(ROLES.SUPER_ADMIN), password: 'Password@123', role: ROLES.SUPER_ADMIN, branch: 'all' },
    ...ROLES_ALL.filter((r) => r !== ROLES.SUPER_ADMIN).map((role) => ({
      name: `OC RBAC ${role}`,
      email: emailFor(role),
      password: 'Password@123',
      role,
      branch: 'bengaluru',
    })),
  ]);

  const student = await PipelineStudent.create({
    studentName: 'OC Matrix Student',
    email: 'oc.matrix.student@test.local',
    phone: '+91 90000 00001',
    programme: 'MSc Testing',
    destination: 'United Kingdom',
    branch: 'bengaluru',
    stage: 'new_enquiry',
    documentsVerified: true,
  });
  studentId = String(student._id);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  for (const role of ROLES_ALL) {
    const res = await api('POST', '/api/v1/auth/login', {
      body: { email: emailFor(role), password: 'Password@123' },
    });
    assert.equal(res.status, 200, `login must succeed for ${role}`);
    tokens[role] = res.body.token;
  }
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const assertAllowed = (res, role, endpoint) =>
  assert.ok(
    res.status >= 200 && res.status < 300,
    `${role} should be ALLOWED on ${endpoint} but got ${res.status}`
  );

const assertForbidden = (res, role, endpoint) =>
  assert.equal(res.status, 403, `${role} should be 403 on ${endpoint} but got ${res.status}`);

const assertAnonymous = (res, endpoint) =>
  assert.equal(res.status, 401, `anonymous should be 401 on ${endpoint} but got ${res.status}`);

test('GET /api/v1/pipeline — super/manager/counsellor/officer allowed, marketing 403, anon 401', async () => {
  for (const role of [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER]) {
    const res = await api('GET', '/api/v1/pipeline', { token: tokens[role] });
    assertAllowed(res, role, 'GET /pipeline');
    assert.ok(Array.isArray(res.body.students), `${role} receives students array`);
  }
  assertForbidden(await api('GET', '/api/v1/pipeline', { token: tokens[ROLES.MARKETING] }), ROLES.MARKETING, 'GET /pipeline');
  assertAnonymous(await api('GET', '/api/v1/pipeline'), 'GET /pipeline');
});

test('POST /api/v1/pipeline — super/manager/counsellor allowed, officer & marketing 403, anon 401', async () => {
  for (const role of [ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR]) {
    const res = await api('POST', '/api/v1/pipeline', {
      token: tokens[role],
      body: {
        studentName: `OC Created By ${role}`,
        email: `oc.created.${role}.${registerCounter++}@test.local`,
        programme: 'MSc QA',
        destination: 'Canada',
      },
    });
    assert.equal(res.status, 201, `${role} should be allowed to create, got ${res.status}`);
    assert.equal(res.body.student.branch, 'bengaluru', 'non-super creation is forced into own branch');
  }

  const superRes = await api('POST', '/api/v1/pipeline', {
    token: tokens[ROLES.SUPER_ADMIN],
    body: {
      studentName: 'OC Created By Super',
      email: `oc.created.super.${registerCounter++}@test.local`,
      programme: 'MSc QA',
      destination: 'Canada',
      branch: 'bengaluru',
    },
  });
  assert.equal(superRes.status, 201, `super should be allowed to create with explicit branch, got ${superRes.status}`);

  assertForbidden(
    await api('POST', '/api/v1/pipeline', {
      token: tokens[ROLES.APPLICATION_OFFICER],
      body: { studentName: 'X Officer', email: `oc.x.${registerCounter++}@t.local`, programme: 'P', destination: 'UK' },
    }),
    ROLES.APPLICATION_OFFICER,
    'POST /pipeline'
  );
  assertForbidden(
    await api('POST', '/api/v1/pipeline', {
      token: tokens[ROLES.MARKETING],
      body: { studentName: 'X Marketing', email: `oc.x.${registerCounter++}@t.local`, programme: 'P', destination: 'UK' },
    }),
    ROLES.MARKETING,
    'POST /pipeline'
  );
  assertAnonymous(
    await api('POST', '/api/v1/pipeline', {
      body: { studentName: 'X Anon', email: `oc.x.${registerCounter++}@t.local`, programme: 'P', destination: 'UK' },
    }),
    'POST /pipeline'
  );
});

test('PATCH /api/v1/pipeline/:id/stage — super/manager/counsellor allowed, officer & marketing 403, anon 401', async () => {
  for (const role of [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR]) {
    const res = await api('PATCH', `/api/v1/pipeline/${studentId}/stage`, {
      token: tokens[role],
      body: { stage: 'counselling' },
    });
    assert.equal(res.status, 200, `${role} should be allowed to move stage, got ${res.status}`);
    assert.equal(res.body.student.stage, 'counselling');
  }
  assertForbidden(
    await api('PATCH', `/api/v1/pipeline/${studentId}/stage`, { token: tokens[ROLES.APPLICATION_OFFICER], body: { stage: 'shortlisted' } }),
    ROLES.APPLICATION_OFFICER,
    'PATCH /pipeline/:id/stage'
  );
  assertForbidden(
    await api('PATCH', `/api/v1/pipeline/${studentId}/stage`, { token: tokens[ROLES.MARKETING], body: { stage: 'shortlisted' } }),
    ROLES.MARKETING,
    'PATCH /pipeline/:id/stage'
  );
  assertAnonymous(
    await api('PATCH', `/api/v1/pipeline/${studentId}/stage`, { body: { stage: 'shortlisted' } }),
    'PATCH /pipeline/:id/stage'
  );
});

test('PATCH /api/v1/pipeline/:id/documents — super/manager/officer allowed, counsellor & marketing 403, anon 401', async () => {
  for (const role of [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER]) {
    const res = await api('PATCH', `/api/v1/pipeline/${studentId}/documents`, {
      token: tokens[role],
      body: { documentsVerified: true },
    });
    assert.equal(res.status, 200, `${role} should be allowed to verify documents, got ${res.status}`);
  }
  assertForbidden(
    await api('PATCH', `/api/v1/pipeline/${studentId}/documents`, { token: tokens[ROLES.COUNSELLOR], body: { documentsVerified: true } }),
    ROLES.COUNSELLOR,
    'PATCH /pipeline/:id/documents'
  );
  assertForbidden(
    await api('PATCH', `/api/v1/pipeline/${studentId}/documents`, { token: tokens[ROLES.MARKETING], body: { documentsVerified: true } }),
    ROLES.MARKETING,
    'PATCH /pipeline/:id/documents'
  );
  assertAnonymous(
    await api('PATCH', `/api/v1/pipeline/${studentId}/documents`, { body: { documentsVerified: true } }),
    'PATCH /pipeline/:id/documents'
  );
});

test('GET /api/v1/users — super & manager allowed, all other roles 403, anon 401', async () => {
  for (const role of [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER]) {
    const res = await api('GET', '/api/v1/users', { token: tokens[role] });
    assertAllowed(res, role, 'GET /users');
    assert.ok(Array.isArray(res.body.users) || Array.isArray(res.body.data), `${role} receives users payload`);
  }
  for (const role of [ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER, ROLES.MARKETING]) {
    assertForbidden(await api('GET', '/api/v1/users', { token: tokens[role] }), role, 'GET /users');
  }
  assertAnonymous(await api('GET', '/api/v1/users'), 'GET /users');
});

test('POST /api/v1/auth/register — only super_admin allowed, everyone else 403, anon 401', async () => {
  const ok = await api('POST', '/api/v1/auth/register', {
    token: tokens[ROLES.SUPER_ADMIN],
    body: {
      name: 'OC Matrix Provisioned',
      email: `oc.matrix.provisioned.${registerCounter++}@test.local`,
      password: 'Password@123',
      role: ROLES.COUNSELLOR,
      branch: 'bengaluru',
    },
  });
  assert.equal(ok.status, 201, `super must be allowed to register staff, got ${ok.status}`);

  for (const role of ROLES_ALL.filter((r) => r !== ROLES.SUPER_ADMIN)) {
    const res = await api('POST', '/api/v1/auth/register', {
      token: tokens[role],
      body: {
        name: 'OC Matrix Escalation',
        email: `oc.matrix.esc.${role}.${registerCounter++}@test.local`,
        password: 'Password@123',
        role: ROLES.SUPER_ADMIN,
        branch: 'all',
      },
    });
    assertForbidden(res, role, 'POST /register');
    const created = await User.findOne({ email: { $regex: `^oc\\.matrix\\.esc\\.${role}\\.` } });
    assert.equal(created, null, `no user must be created by ${role}`);
  }
  assertAnonymous(
    await api('POST', '/api/v1/auth/register', {
      body: { name: 'Anon', email: `oc.matrix.anon.${registerCounter++}@test.local`, password: 'Password@123' },
    }),
    'POST /register'
  );
});
