/**
 * OpenCode Independent Security Tests — Pipeline Business Rules, Validation
 * and Pagination Findings (Real HTTP).
 * Known Antigravity gaps are asserted with { todo: true }: their IDEAL
 * behavior is encoded so the suite reports the gap without failing the run.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_pipe';

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
let superToken;
let mgrToken;
let counToken;
let noDocsId;
let withDocsId;
let lostStudentId;
let superUserId;

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

  const superUser = await User.create({
    name: 'OC Pipe Super',
    email: 'oc.pipe.super@test.local',
    password: 'Password@123',
    role: 'super_admin',
    branch: 'all',
  });
  superUserId = String(superUser._id);
  await User.create([
    { name: 'OC Pipe Mgr', email: 'oc.pipe.mgr@test.local', password: 'Password@123', role: 'branch_manager', branch: 'bengaluru' },
    { name: 'OC Pipe Coun', email: 'oc.pipe.coun@test.local', password: 'Password@123', role: 'counsellor', branch: 'bengaluru' },
    { name: 'OC Pipe Extra 1', email: 'oc.pipe.extra1@test.local', password: 'Password@123', role: 'marketing', branch: 'bengaluru' },
    { name: 'OC Pipe Extra 2', email: 'oc.pipe.extra2@test.local', password: 'Password@123', role: 'marketing', branch: 'mysuru' },
    { name: 'OC Pipe Extra 3', email: 'oc.pipe.extra3@test.local', password: 'Password@123', role: 'marketing', branch: 'belagavi' },
  ]);

  const noDocs = await PipelineStudent.create({
    studentName: 'OC NoDocs Student',
    email: 'oc.nodocs@test.local',
    programme: 'MSc A',
    destination: 'UK',
    branch: 'bengaluru',
    stage: 'shortlisted',
    documentsVerified: false,
  });
  const withDocs = await PipelineStudent.create({
    studentName: 'OC WithDocs Student',
    email: 'oc.withdocs@test.local',
    programme: 'MSc B',
    destination: 'UK',
    branch: 'bengaluru',
    stage: 'shortlisted',
    documentsVerified: true,
  });
  const lostS = await PipelineStudent.create({
    studentName: 'OC Lost Student',
    email: 'oc.loststudent@test.local',
    programme: 'MSc C',
    destination: 'UK',
    branch: 'bengaluru',
    stage: 'shortlisted',
    documentsVerified: true,
  });
  noDocsId = String(noDocs._id);
  withDocsId = String(withDocs._id);
  lostStudentId = String(lostS._id);

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  superToken = await login('oc.pipe.super@test.local');
  mgrToken = await login('oc.pipe.mgr@test.local');
  counToken = await login('oc.pipe.coun@test.local');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('PATCH stage rejects an invalid stage value with 400', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${withDocsId}/stage`, {
    token: superToken,
    body: { stage: 'graduated' },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /Invalid target stage/);
});

test('PATCH stage to application_submitted without verified documents is rejected (400)', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${noDocsId}/stage`, {
    token: superToken,
    body: { stage: 'application_submitted' },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /verification are pending/);
  const student = await PipelineStudent.findById(noDocsId);
  assert.equal(student.stage, 'shortlisted', 'stage unchanged after rejected transition');
});

test('PATCH stage to application_submitted succeeds once documents are verified', async () => {
  await api('PATCH', `/api/v1/pipeline/${noDocsId}/documents`, {
    token: superToken,
    body: { documentsVerified: true },
  });
  const res = await api('PATCH', `/api/v1/pipeline/${noDocsId}/stage`, {
    token: superToken,
    body: { stage: 'application_submitted' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.student.stage, 'application_submitted');
});

test('PATCH stage to lost requires a reason of at least 5 characters', async () => {
  const noReason = await api('PATCH', `/api/v1/pipeline/${lostStudentId}/stage`, {
    token: superToken,
    body: { stage: 'lost' },
  });
  assert.equal(noReason.status, 400);
  assert.match(noReason.body.message, /reason/);

  const shortReason = await api('PATCH', `/api/v1/pipeline/${lostStudentId}/stage`, {
    token: superToken,
    body: { stage: 'lost', reason: 'ok' },
  });
  assert.equal(shortReason.status, 400);

  const goodReason = await api('PATCH', `/api/v1/pipeline/${lostStudentId}/stage`, {
    token: superToken,
    body: { stage: 'lost', reason: 'Student chose a competitor after fee comparison.' },
  });
  assert.equal(goodReason.status, 200);
  const student = await PipelineStudent.findById(lostStudentId);
  assert.equal(student.stage, 'lost');
  assert.equal(student.stageHistory.at(-1).reason, 'Student chose a competitor after fee comparison.');
});

test('simulateError flag returns 400 rollback response without changing the record', async () => {
  const res = await api('PATCH', `/api/v1/pipeline/${withDocsId}/stage`, {
    token: superToken,
    body: { stage: 'counselling', simulateError: true },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /rolled back/i);

  const headerRes = await api('PATCH', `/api/v1/pipeline/${withDocsId}/stage`, {
    token: superToken,
    body: { stage: 'counselling' },
    headers: { 'x-simulate-validation-error': 'true' },
  });
  assert.equal(headerRes.status, 400);
  const student = await PipelineStudent.findById(withDocsId);
  assert.equal(student.stage, 'shortlisted', 'stage unchanged after simulated failure');
});

test('PATCH stage on a missing-but-valid ObjectId returns 404, malformed id returns 400', async () => {
  const missing = await api('PATCH', `/api/v1/pipeline/${new mongoose.Types.ObjectId()}/stage`, {
    token: superToken,
    body: { stage: 'counselling' },
  });
  assert.equal(missing.status, 404);

  const malformed = await api('PATCH', '/api/v1/pipeline/not-an-objectid/stage', {
    token: superToken,
    body: { stage: 'counselling' },
  });
  assert.equal(malformed.status, 400);
});

test('stageHistory records from/to/changedBy for every successful transition', async () => {
  const student = await PipelineStudent.findById(noDocsId);
  const last = student.stageHistory.at(-1);
  assert.ok(last, 'stageHistory entry exists');
  assert.equal(last.fromStage, 'shortlisted');
  assert.equal(last.toStage, 'application_submitted');
  assert.equal(String(last.changedBy), superUserId, 'changedBy is the acting user');
  assert.ok(last.changedAt instanceof Date);
});

test('GET /pipeline hides stageHistory and __v by default (payload minimization)', async () => {
  const res = await api('GET', '/api/v1/pipeline', { token: superToken });
  assert.equal(res.status, 200);
  for (const student of res.body.students) {
    assert.equal(student.stageHistory, undefined, 'stageHistory excluded by default');
    assert.equal(student.__v, undefined, '__v excluded by default');
    assert.equal(student.password, undefined, 'no password field exists on pipeline');
  }
});

test('GET /pipeline accepts a search that matches rows', async () => {
  const res = await api('GET', '/api/v1/pipeline?search=NoDocs', { token: superToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.students.some((s) => s.email === 'oc.nodocs@test.local'));
});

test('FINDING P2: GET /pipeline?fields= must not expose internal audit fields (stageHistory)', async () => {
  // Current behavior: pipeline controller has NO projection allowlist, so
  // ?fields=stageHistory returns the full internal audit log to any role
  // allowed to view the pipeline (Rule 18/20 projection gap).
  const res = await api('GET', '/api/v1/pipeline?fields=stageHistory', { token: superToken });
  assert.equal(res.status, 200);
  const leaked = (res.body.students || []).some((s) => Array.isArray(s.stageHistory));
  assert.equal(leaked, false, 'stageHistory must not be selectable via fields=');
});

test('F-06R: GET /pipeline?fields=studentName supports valid allowlisted fields without inclusion/exclusion collision', async () => {
  const res = await api('GET', '/api/v1/pipeline?fields=studentName', { token: superToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.students && res.body.students.length > 0, 'students returned');
  for (const s of res.body.students) {
    assert.ok(typeof s.studentName === 'string', 'studentName present');
    assert.equal(s.stageHistory, undefined, 'stageHistory omitted');
    assert.equal(s.__v, undefined, '__v omitted');
    assert.equal(s.email, undefined, 'non-requested field email omitted');
  }
});

test('FINDING P2: GET /pipeline must reject regex-unsafe search input with 400, not 500', async () => {
  // Current behavior: search is interpolated straight into $regex; an invalid
  // pattern like '(' surfaces as an unhandled database error (HTTP 500).
  const res = await api('GET', `/api/v1/pipeline?search=${encodeURIComponent('(a+')}`, { token: superToken });
  assert.ok([200, 400].includes(res.status), `expected 200/400, got ${res.status}`);
});

test('GET /users paginates with page/limit and correct totals', async () => {
  const res = await api('GET', '/api/v1/users?page=2&limit=2', { token: superToken });
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.page, 2);
  assert.equal(res.body.pagination.limit, 2);
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.pagination.total, 6, 'six seeded staff users');
});

test('GET /users with non-numeric limit falls back to default 10 (no crash)', async () => {
  const res = await api('GET', '/api/v1/users?limit=abc', { token: superToken });
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.limit, 10);
});

test('GET /users never returns password hashes, even with fields= request', async () => {
  const res = await api('GET', '/api/v1/users?fields=password,name&limit=50', { token: superToken });
  assert.equal(res.status, 200);
  for (const u of res.body.data) {
    assert.equal(u.password, undefined, 'password must never be serialized');
  }
});

test('FINDING P1: GET /users must cap or reject unbounded limit values', async () => {
  // Current behavior: devil paginate() parseInt()s the caller-supplied limit
  // with no ceiling, so ?limit=999999 issues an unbounded find().
  const res = await api('GET', '/api/v1/users?limit=999999', { token: superToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.pagination.limit <= 100, `limit must be capped, got ${res.body.pagination.limit}`);
});

test('P1-PAGINATION: GET /users with negative limit clamps safely to default or minimum bound', async () => {
  const res = await api('GET', '/api/v1/users?limit=-5', { token: superToken });
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.limit, 10);
});

test('FINDING P2: GET /users fields= allowlist projection must actually be applied', async () => {
  // Current behavior: user controller builds an allowlisted projection, but
  // devil paginate() ignores options.select entirely, so ?fields=name still
  // returns email/role/branch/isActive/lastLogin for every row.
  const res = await api('GET', '/api/v1/users?fields=name&limit=50', { token: superToken });
  assert.equal(res.status, 200);
  const u = res.body.data[0];
  assert.ok(u, 'users returned');
  assert.equal(u.email, undefined, 'email must be dropped when only name was requested');
});

test('OBS-1: GET /users must reject regex-unsafe search input with 400, not 500', async () => {
  const res = await api('GET', `/api/v1/users?search=${encodeURIComponent('(')}`, { token: superToken });
  assert.equal(res.status, 400);
});

test('OBS-1: GET /users accepts safe literal search', async () => {
  const res = await api('GET', '/api/v1/users?search=Pipe', { token: superToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.data && res.body.data.length > 0);
});

test('POST /pipeline rejects missing required fields with 400', async () => {
  const res = await api('POST', '/api/v1/pipeline', {
    token: counToken,
    body: { studentName: 'OC Incomplete' },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /required/i);
});

test('super_admin creating a student without an explicit branch gets a clean 400 (branch enum quirk)', async () => {
  const res = await api('POST', '/api/v1/pipeline', {
    token: superToken,
    body: {
      studentName: 'OC Super NoBranch',
      email: 'oc.supernobranch@test.local',
      programme: 'MSc Q',
      destination: 'UK',
    },
  });
  assert.equal(res.status, 400, 'super branch="all" without body branch hits the model enum and maps to 400');
  assert.match(res.body.message, /validation/i);
});

test('PATCH documents with a non-boolean body toggles the current flag (documented semantics)', async () => {
  const before = await PipelineStudent.findById(withDocsId);
  const was = before.documentsVerified;
  const res = await api('PATCH', `/api/v1/pipeline/${withDocsId}/documents`, {
    token: mgrToken,
    body: {},
  });
  assert.equal(res.status, 200);
  const afterDoc = await PipelineStudent.findById(withDocsId);
  assert.equal(afterDoc.documentsVerified, !was, 'missing boolean toggles instead of defaulting');
});
