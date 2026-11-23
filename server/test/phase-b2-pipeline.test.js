const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_crm_test_b2';
const JWT_SECRET = 'b2_pipeline_test_jwt_secret_2026';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGO_URI = TEST_MONGO_URI;

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { PIPELINE_STAGES, BRANCHES, ROLES } = require('../src/config/constants');

let server;
let baseUrl;

function jsonRequest(method, path, body = null, token = null) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  }).then(async (res) => {
    let json = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response
    }
    return { status: res.status, body: json, headers: res.headers };
  });
}

function signTestToken(user) {
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
}

test.before(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_crm_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
  await PipelineStudent.deleteMany({});
  await User.deleteMany({ email: /.*@phaseb2\.test\.local$/ });

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await PipelineStudent.deleteMany({});
  await User.deleteMany({ email: /.*@phaseb2\.test\.local$/ });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('B2.1: Full sequential forward transitions through all 15 stages to ENROLLED', async () => {
  const superAdmin = await User.create({
    name: 'Admin Priya',
    email: 'admin.priya@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.SUPER_ADMIN,
    branch: BRANCHES.ALL,
  });
  const token = signTestToken(superAdmin);

  const student = await PipelineStudent.create({
    studentName: 'Rahul Sharma',
    email: 'rahul.sharma@phaseb2.test.local',
    programme: 'MSc Data Science',
    destination: 'United Kingdom',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.NEW,
    documentsVerified: false,
  });

  const forwardStages = [
    PIPELINE_STAGES.CONTACTED,
    PIPELINE_STAGES.QUALIFIED,
    PIPELINE_STAGES.COUNSELLING_BOOKED,
    PIPELINE_STAGES.COUNSELLING_COMPLETED,
    PIPELINE_STAGES.SHORTLISTED,
    PIPELINE_STAGES.APPLICATION_STARTED,
    PIPELINE_STAGES.DOCUMENTS_COMPLETE,
  ];

  let currentExpected = PIPELINE_STAGES.NEW;
  for (const nextStage of forwardStages) {
    const res = await jsonRequest(
      'PATCH',
      `/api/v1/pipeline/${student._id}/stage`,
      { stage: nextStage, expectedStage: currentExpected },
      token
    );
    assert.strictEqual(res.status, 200, `Failed moving to ${nextStage}: ${res.body?.message}`);
    assert.strictEqual(res.body.student.stage, nextStage);
    currentExpected = nextStage;
  }

  // Document verification gate check: moving to SUBMITTED without docs verified must fail 400
  const gateRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.SUBMITTED, expectedStage: currentExpected },
    token
  );
  assert.strictEqual(gateRes.status, 400);
  assert.match(gateRes.body.message, /documents must be verified/i);

  // Now verify documents
  const verifyRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/documents`,
    { documentsVerified: true },
    token
  );
  assert.strictEqual(verifyRes.status, 200);
  assert.strictEqual(verifyRes.body.student.documentsVerified, true);

  // Moving to SUBMITTED now succeeds
  const subRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.SUBMITTED, expectedStage: currentExpected },
    token
  );
  assert.strictEqual(subRes.status, 200);
  assert.strictEqual(subRes.body.student.stage, PIPELINE_STAGES.SUBMITTED);
  currentExpected = PIPELINE_STAGES.SUBMITTED;

  // Remaining stages through to ENROLLED
  const postSubmissionStages = [
    PIPELINE_STAGES.OFFER_RECEIVED,
    PIPELINE_STAGES.DEPOSIT_PAID,
    PIPELINE_STAGES.VISA_FILED,
    PIPELINE_STAGES.VISA_DECISION,
    PIPELINE_STAGES.PRE_DEPARTURE,
    PIPELINE_STAGES.ENROLLED,
  ];

  for (const nextStage of postSubmissionStages) {
    const res = await jsonRequest(
      'PATCH',
      `/api/v1/pipeline/${student._id}/stage`,
      { stage: nextStage, expectedStage: currentExpected },
      token
    );
    assert.strictEqual(res.status, 200, `Failed moving to ${nextStage}: ${res.body?.message}`);
    assert.strictEqual(res.body.student.stage, nextStage);
    currentExpected = nextStage;
  }

  const finalRecord = await PipelineStudent.findById(student._id);
  assert.strictEqual(finalRecord.stage, PIPELINE_STAGES.ENROLLED);
  // Full audit trail must have recorded all 14 transitions
  assert.strictEqual(finalRecord.stageHistory.length, 14);
});

test('B2.2: Backward transitions (revision steps) succeed within allowed state matrix', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Ananya',
    email: 'ananya.counsellor@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.MYSURU,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Vikram Joshi',
    email: 'vikram.joshi@phaseb2.test.local',
    programme: 'BEng Mechanical',
    destination: 'Germany',
    branch: BRANCHES.MYSURU,
    stage: PIPELINE_STAGES.QUALIFIED,
  });

  // Backward: QUALIFIED -> CONTACTED
  const backRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.CONTACTED, expectedStage: PIPELINE_STAGES.QUALIFIED },
    token
  );
  assert.strictEqual(backRes.status, 200);
  assert.strictEqual(backRes.body.student.stage, PIPELINE_STAGES.CONTACTED);

  // Backward: CONTACTED -> NEW
  const backToNew = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.NEW, expectedStage: PIPELINE_STAGES.CONTACTED },
    token
  );
  assert.strictEqual(backToNew.status, 200);
  assert.strictEqual(backToNew.body.student.stage, PIPELINE_STAGES.NEW);
});

test('B2.3: Lost state requires mandatory reason >= 5 characters; invalid reasons are rejected', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Ravi',
    email: 'ravi.counsellor@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Sneha Rao',
    email: 'sneha.rao@phaseb2.test.local',
    programme: 'MBA',
    destination: 'Canada',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.CONTACTED,
  });

  // Missing reason
  const noReason = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.LOST },
    token
  );
  assert.strictEqual(noReason.status, 400);
  assert.match(noReason.body.message, /mandatory reason of at least 5 characters/i);

  // Too short reason (< 5 chars)
  const shortReason = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.LOST, reason: 'Drop' },
    token
  );
  assert.strictEqual(shortReason.status, 400);
  assert.match(shortReason.body.message, /at least 5 characters/i);

  // Valid reason (>= 5 chars)
  const validLost = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.LOST, reason: 'Budget constraints prevented international study' },
    token
  );
  assert.strictEqual(validLost.status, 200);
  assert.strictEqual(validLost.body.student.stage, PIPELINE_STAGES.LOST);

  const fresh = await PipelineStudent.findById(student._id);
  assert.strictEqual(fresh.exitReason, 'Budget constraints prevented international study');
});

test('B2.4: Deferred state requires reason >= 5 characters and persists optional deferred intake', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Maya',
    email: 'maya.counsellor@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BELAGAVI,
  });
  const token = signTestToken(counsellor);

  const student = await PipelineStudent.create({
    studentName: 'Amit Desai',
    email: 'amit.desai@phaseb2.test.local',
    programme: 'MSc Computer Science',
    destination: 'Ireland',
    branch: BRANCHES.BELAGAVI,
    stage: PIPELINE_STAGES.OFFER_RECEIVED,
  });

  const validDeferred = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    {
      stage: PIPELINE_STAGES.DEFERRED,
      reason: 'Candidate requested deferral due to medical leave',
      deferredIntake: 'Spring 2027',
    },
    token
  );
  assert.strictEqual(validDeferred.status, 200);
  assert.strictEqual(validDeferred.body.student.stage, PIPELINE_STAGES.DEFERRED);

  const fresh = await PipelineStudent.findById(student._id);
  assert.strictEqual(fresh.exitReason, 'Candidate requested deferral due to medical leave');
  assert.strictEqual(fresh.deferredIntake, 'Spring 2027');
});

test('B2.5: Reopening a Lost or Deferred candidate is restricted to Super Admin and Branch Manager', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Arjun',
    email: 'arjun.counsellor@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });
  const manager = await User.create({
    name: 'Manager Deepa',
    email: 'deepa.manager@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.BENGALURU,
  });

  const student = await PipelineStudent.create({
    studentName: 'Kiran Kumar',
    email: 'kiran.kumar@phaseb2.test.local',
    programme: 'MSc AI',
    destination: 'USA',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.LOST,
    exitReason: 'Dropped out due to personal reasons',
  });

  // Counsellor attempt to reopen -> 403 Forbidden
  const counToken = signTestToken(counsellor);
  const counRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.CONTACTED },
    counToken
  );
  assert.strictEqual(counRes.status, 403);
  assert.match(counRes.body.message, /Super Admin or Branch Manager can reopen/i);

  // Branch Manager attempt to reopen -> 200 OK
  const mgrToken = signTestToken(manager);
  const mgrRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.CONTACTED },
    mgrToken
  );
  assert.strictEqual(mgrRes.status, 200);
  assert.strictEqual(mgrRes.body.student.stage, PIPELINE_STAGES.CONTACTED);
});

test('B2.6: RBAC enforces stage modification restrictions (Marketing & Application Officer denied)', async () => {
  const marketing = await User.create({
    name: 'Marketing Rohit',
    email: 'rohit.marketing@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.MARKETING,
    branch: BRANCHES.BENGALURU,
  });
  const officer = await User.create({
    name: 'Officer Tanvi',
    email: 'tanvi.officer@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.APPLICATION_OFFICER,
    branch: BRANCHES.BENGALURU,
  });

  const student = await PipelineStudent.create({
    studentName: 'Varun Nair',
    email: 'varun.nair@phaseb2.test.local',
    programme: 'BBA',
    destination: 'Australia',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.QUALIFIED,
  });

  // Marketing -> 403
  const mktRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.COUNSELLING_BOOKED },
    signTestToken(marketing)
  );
  assert.strictEqual(mktRes.status, 403);

  // Application Officer -> 403
  const offRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/stage`,
    { stage: PIPELINE_STAGES.COUNSELLING_BOOKED },
    signTestToken(officer)
  );
  assert.strictEqual(offRes.status, 403);
});

test('B2.7: Document verification authorization: Application Officer allowed, Counsellor denied', async () => {
  const counsellor = await User.create({
    name: 'Counsellor Preeti',
    email: 'preeti.counsellor@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
  });
  const officer = await User.create({
    name: 'Officer Sameer',
    email: 'sameer.officer@phaseb2.test.local',
    password: 'Password123!',
    role: ROLES.APPLICATION_OFFICER,
    branch: BRANCHES.BENGALURU,
  });

  const student = await PipelineStudent.create({
    studentName: 'Farhan Ali',
    email: 'farhan.ali@phaseb2.test.local',
    programme: 'MSc Data Analytics',
    destination: 'Ireland',
    branch: BRANCHES.BENGALURU,
    stage: PIPELINE_STAGES.DOCUMENTS_COMPLETE,
    documentsVerified: false,
  });

  // Counsellor toggling documents -> 403 Forbidden
  const counRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/documents`,
    { documentsVerified: true },
    signTestToken(counsellor)
  );
  assert.strictEqual(counRes.status, 403);

  // Officer toggling documents -> 200 OK
  const offRes = await jsonRequest(
    'PATCH',
    `/api/v1/pipeline/${student._id}/documents`,
    { documentsVerified: true },
    signTestToken(officer)
  );
  assert.strictEqual(offRes.status, 200);
  assert.strictEqual(offRes.body.student.documentsVerified, true);
});

test('B2.8: Pipeline query supports projection minimization and bounds pagination', async () => {
  const superAdmin = await User.findOne({ email: 'admin.priya@phaseb2.test.local' });
  const token = signTestToken(superAdmin);

  // Projection minimization (Rule 18 / Rule 20)
  const projRes = await jsonRequest('GET', '/api/v1/pipeline?fields=studentName,stage,branch', null, token);
  assert.strictEqual(projRes.status, 200);
  assert.ok(projRes.body.students.length > 0);
  const sample = projRes.body.students[0];
  assert.ok(sample.studentName !== undefined);
  assert.ok(sample.stage !== undefined);
  assert.strictEqual(sample.stageHistory, undefined);
  assert.strictEqual(sample.__v, undefined);

  // Pagination bounds
  const boundedRes = await jsonRequest('GET', '/api/v1/pipeline?limit=2', null, token);
  assert.strictEqual(boundedRes.status, 200);
  assert.ok(boundedRes.body.students.length <= 2);
});
