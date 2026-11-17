/**
 * OpenCode Independent Security Tests — Branch Isolation (Real HTTP)
 * Proves query scoping and record-level write guards: a restricted user can
 * only read/write their own branch, headers cannot bypass scope, and the
 * latent non-super branch='all' account behaves as observed.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_branch';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'opencode-independent-test-secret-9f8e7d6c';
process.env.MONGO_URI = TEST_MONGO_URI;
delete process.env.CLIENT_URL;
delete process.env.FRONTEND_URL;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');

let server;
let baseUrl;
let t = {};

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

const login = async (email) => {
  const res = await api('POST', '/api/v1/auth/login', { body: { email, password: 'Password@123' } });
  assert.equal(res.status, 200, `login must succeed for ${email}`);
  return res.body.token;
};

before(async () => {
  assert.ok(process.env.MONGO_URI.includes('_test'), 'SAFETY: *_test database only');
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  await User.create([
    { name: 'OC Branch Super', email: 'oc.branch.super@test.local', password: 'Password@123', role: 'super_admin', branch: 'all' },
    { name: 'OC Mgr BLR', email: 'oc.branch.mgr.blr@test.local', password: 'Password@123', role: 'branch_manager', branch: 'bengaluru' },
    { name: 'OC Mgr MYS', email: 'oc.branch.mgr.mys@test.local', password: 'Password@123', role: 'branch_manager', branch: 'mysuru' },
    { name: 'OC Coun BLR', email: 'oc.branch.coun.blr@test.local', password: 'Password@123', role: 'counsellor', branch: 'bengaluru' },
    { name: 'OC Coun MYS', email: 'oc.branch.coun.mys@test.local', password: 'Password@123', role: 'counsellor', branch: 'mysuru' },
    // Latent pattern: registerValidator blocks this, model enum allows it.
    { name: 'OC Global NonSuper', email: 'oc.branch.global@test.local', password: 'Password@123', role: 'counsellor', branch: 'all' },
  ]);

  const blr = await PipelineStudent.create({
    studentName: 'OC BLR Student',
    email: 'oc.blr.student@test.local',
    programme: 'MSc BLR',
    destination: 'UK',
    branch: 'bengaluru',
    stage: 'counselling',
    documentsVerified: true,
  });
  const mys = await PipelineStudent.create({
    studentName: 'OC MYS Student',
    email: 'oc.mys.student@test.local',
    programme: 'MSc MYS',
    destination: 'UK',
    branch: 'mysuru',
    stage: 'counselling',
    documentsVerified: true,
  });
  t.blrStudentId = String(blr._id);
  t.mysStudentId = String(mys._id);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.super = await login('oc.branch.super@test.local');
  t.mgrBlr = await login('oc.branch.mgr.blr@test.local');
  t.mgrMys = await login('oc.branch.mgr.mys@test.local');
  t.counBlr = await login('oc.branch.coun.blr@test.local');
  t.counMys = await login('oc.branch.coun.mys@test.local');
  t.globalNonSuper = await login('oc.branch.global@test.local');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const pipelineEmails = (body) => (body.students || []).map((s) => s.email);

test('counsellor (bengaluru) GET /pipeline sees only own-branch students', async () => {
  const res = await api('GET', '/api/v1/pipeline', { token: t.counBlr });
  assert.equal(res.status, 200);
  const emails = pipelineEmails(res.body);
  assert.ok(emails.includes('oc.blr.student@test.local'), 'own-branch student visible');
  assert.ok(!emails.includes('oc.mys.student@test.local'), 'other-branch student hidden');
  assert.ok(!emails.includes('oc.mys.student@test.local') && emails.every((e) => !e.includes('mys')), 'no mysuru rows leak');
});

test('counsellor (bengaluru) requesting ?branch=mysuru gets 403', async () => {
  const res = await api('GET', '/api/v1/pipeline?branch=mysuru', { token: t.counBlr });
  assert.equal(res.status, 403);
  assert.match(res.body.message, /restricted to the 'bengaluru' branch/);
});

test('counsellor (bengaluru) requesting ?branch=all stays scoped to own branch (forced)', async () => {
  const res = await api('GET', '/api/v1/pipeline?branch=all', { token: t.counBlr });
  assert.equal(res.status, 200);
  const emails = pipelineEmails(res.body);
  assert.ok(!emails.includes('oc.mys.student@test.local'), 'branch=all must not widen a restricted scope');
});

test('x-branch header from a restricted user does not bypass scope', async () => {
  const res = await api('GET', '/api/v1/pipeline', { token: t.counBlr, headers: { 'x-branch': 'mysuru' } });
  assert.equal(res.status, 200);
  const emails = pipelineEmails(res.body);
  assert.ok(!emails.includes('oc.mys.student@test.local'), 'x-branch header ignored for restricted users');
});

test('restricted user cannot move a cross-branch student stage (403 record guard)', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${t.mysStudentId}/stage`, {
    token: t.counBlr,
    body: { stage: 'shortlisted' },
  });
  assert.equal(res.status, 403);
  assert.match(res.body.message, /another branch/i);
  const student = await PipelineStudent.findById(t.mysStudentId);
  assert.equal(student.stage, 'counselling', 'stage unchanged after rejected write');
});

test('restricted user cannot toggle documents on a cross-branch student (403 record guard)', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${t.mysStudentId}/documents`, {
    token: t.mgrBlr,
    body: { documentsVerified: false },
  });
  assert.equal(res.status, 403);
  const student = await PipelineStudent.findById(t.mysStudentId);
  assert.equal(student.documentsVerified, true, 'documents unchanged after rejected write');
});

test('super_admin can modify a student from any branch', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${t.mysStudentId}/stage`, {
    token: t.super,
    body: { stage: 'shortlisted' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.student.stage, 'shortlisted');
});

test('mysuru manager cannot modify a bengaluru student (403 record guard)', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${t.blrStudentId}/stage`, {
    token: t.mgrMys,
    body: { stage: 'application_submitted' },
  });
  assert.equal(res.status, 403);
});

test('counsellor cannot create a student assigned to another branch via body (403)', async () => {
  const res = await api('POST', '/api/v1/pipeline', {
    token: t.counBlr,
    body: {
      studentName: 'OC Cross Branch Plant',
      email: 'oc.crossbranch.plant@test.local',
      programme: 'MSc X',
      destination: 'UK',
      branch: 'mysuru',
    },
  });
  assert.equal(res.status, 403);
  const exists = await PipelineStudent.findOne({ email: 'oc.crossbranch.plant@test.local' });
  assert.equal(exists, null, 'no cross-branch student persisted');
});

test('counsellor creation without explicit branch is forced into own branch', async () => {
  const res = await api('POST', '/api/v1/pipeline', {
    token: t.counBlr,
    body: {
      studentName: 'OC Own Branch Create',
      email: 'oc.ownbranch.create@test.local',
      programme: 'MSc Y',
      destination: 'UK',
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.student.branch, 'bengaluru');
});

test('manager (bengaluru) GET /users returns only own-branch staff', async () => {
  const res = await api('GET', '/api/v1/users?limit=100', { token: t.mgrBlr });
  assert.equal(res.status, 200);
  const emails = (res.body.data || []).map((u) => u.email);
  assert.ok(emails.includes('oc.branch.coun.blr@test.local'), 'own-branch staff visible');
  assert.ok(!emails.includes('oc.branch.coun.mys@test.local'), 'other-branch staff hidden');
  assert.ok(!emails.includes('oc.branch.mgr.mys@test.local'), 'other-branch manager hidden');
});

test('manager (bengaluru) GET /users?branch=mysuru gets 403', async () => {
  const res = await api('GET', '/api/v1/users?branch=mysuru', { token: t.mgrBlr });
  assert.equal(res.status, 403);
});

test('manager (bengaluru) GET /users?branch=all stays forced to own branch', async () => {
  const res = await api('GET', '/api/v1/users?branch=all&limit=100', { token: t.mgrBlr });
  assert.equal(res.status, 200);
  const emails = (res.body.data || []).map((u) => u.email);
  assert.ok(!emails.includes('oc.branch.coun.mys@test.local'), 'branch=all must not widen restricted user scope');
});

test('latent: non-super user with branch="all" reads every branch without any params', async () => {
  const res = await api('GET', '/api/v1/pipeline', { token: t.globalNonSuper });
  assert.equal(res.status, 200);
  const emails = pipelineEmails(res.body);
  assert.ok(
    emails.includes('oc.blr.student@test.local') && emails.includes('oc.mys.student@test.local'),
    'branch="all" non-super account currently has cross-branch READ visibility'
  );
});

test('latent: non-super branch="all" user needs explicit ?branch=all to write across branches', async () => {
  const denied = await api('PATCH', `/api/v1/pipeline/${t.blrStudentId}/stage`, {
    token: t.globalNonSuper,
    body: { stage: 'offer_visa_won' },
  });
  assert.equal(denied.status, 403, 'write without explicit branch=all is denied (quirk of null branchScope)');

  const allowed = await api('PATCH', `/api/v1/pipeline/${t.blrStudentId}/stage?branch=all`, {
    token: t.globalNonSuper,
    body: { stage: 'offer_visa_won' },
  });
  assert.equal(allowed.status, 200, 'explicit ?branch=all grants cross-branch write to this latent account');
});
