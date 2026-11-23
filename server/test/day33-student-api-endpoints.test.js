/**
 * Day 33: Student Profile APIs Verification Suite
 *
 * Verifies:
 * 1. Role-based access control across all 6 student endpoints (Marketing strictly 403)
 * 2. Multi-branch containment and foreign-branch mutation rejection (403)
 * 3. Immutable system-managed field protection (studentId, branch, conversionSource -> 400)
 * 4. Role-restricted administrative fields (status, staff assignments restricted to manager/super -> 403)
 * 5. Field projection allowlisting on list queries (?fields=... -> 400 on illegal fields)
 * 6. Role-based field masking on retrieval (counsellor passport masking and financial sanitization)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const { requireRole } = require('../src/middleware/roleMiddleware');
const { ROLES, BRANCHES, STUDENT_STATUS } = require('../src/config/constants');

const Student = require('../src/modules/students/student.model');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  addStudentNote,
  applyRoleBasedMasking,
  ALLOWED_STUDENT_LIST_FIELDS,
  SYSTEM_MANAGED_CREATION_FIELDS,
  IMMUTABLE_UPDATE_FIELDS,
} = require('../src/modules/students/student.controller');

/**
 * Invokes an Express controller handler and waits for either next(err) or res.json()
 * Essential for devil asyncHandler which returns void while catching asynchronously.
 */
function invokeHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    const next = (err) => {
      resolve({ nextCalled: true, nextError: err || null, res });
    };

    const origJson = res.json ? res.json.bind(res) : null;
    res.json = (data) => {
      if (origJson) origJson(data);
      resolve({ nextCalled: false, nextError: null, res });
    };

    try {
      handler(req, res, next);
    } catch (syncErr) {
      resolve({ nextCalled: true, nextError: syncErr, res });
    }
  });
}

describe('Day 33: Student Profile API Authorization & Role Matrix', () => {
  const studentViewRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
    ROLES.APPLICATION_OFFICER,
  ];

  const studentMutateRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.BRANCH_MANAGER,
    ROLES.COUNSELLOR,
  ];

  test('B3.33.1: View routes allow 4 staff roles and strictly reject marketing (403)', () => {
    const guard = requireRole(...studentViewRoles);

    for (const role of studentViewRoles) {
      const { req, res, next, getNext } = mockReqRes({
        user: { role, branch: BRANCHES.BENGALURU },
      });
      guard(req, res, next);
      const { nextCalled, nextError } = getNext();
      assert.strictEqual(nextCalled, true, `Role ${role} passes view guard`);
      assert.strictEqual(nextError, null, `No error for ${role}`);
    }

    // Marketing denied
    const { req, res, next, getNext } = mockReqRes({
      user: { role: ROLES.MARKETING, branch: BRANCHES.BENGALURU },
    });
    guard(req, res, next);
    const { nextError } = getNext();
    assert.ok(nextError, 'Marketing role receives error on view');
    assert.strictEqual(nextError.statusCode, 403);
    assert.match(nextError.message, /Forbidden/i);
  });

  test('B3.33.2: Mutation routes allow 3 roles and reject application_officer and marketing (403)', () => {
    const guard = requireRole(...studentMutateRoles);

    for (const role of studentMutateRoles) {
      const { req, res, next, getNext } = mockReqRes({
        user: { role, branch: BRANCHES.BENGALURU },
      });
      guard(req, res, next);
      const { nextCalled, nextError } = getNext();
      assert.strictEqual(nextCalled, true, `Role ${role} passes mutate guard`);
      assert.strictEqual(nextError, null, `No error for ${role}`);
    }

    // Application Officer denied mutate
    const { req: reqAO, next: nextAO, getNext: getNextAO } = mockReqRes({
      user: { role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
    });
    guard(reqAO, null, nextAO);
    assert.strictEqual(getNextAO().nextError?.statusCode, 403);

    // Marketing denied mutate
    const { req: reqMkt, next: nextMkt, getNext: getNextMkt } = mockReqRes({
      user: { role: ROLES.MARKETING, branch: BRANCHES.BENGALURU },
    });
    guard(reqMkt, null, nextMkt);
    assert.strictEqual(getNextMkt().nextError?.statusCode, 403);
  });
});

describe('Day 33: Branch Containment & Cross-Branch Defense', () => {
  test('B3.33.3: Viewing student from another branch returns 403 for non-super staff', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: studentId,
      studentName: 'Mysuru Student',
      email: 'mysuru.student@example.com',
      branch: BRANCHES.MYSURU,
      isDeleted: false,
    };

    const originalFindOne = Student.findOne;
    Student.findOne = async () => mockStudent;

    try {
      const { req, res } = mockReqRes({
        params: { id: studentId.toString() },
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      });

      const outcome = await invokeHandler(getStudentById, req, res);
      assert.ok(outcome.nextError, 'Cross-branch read rejected with error');
      assert.strictEqual(outcome.nextError.statusCode, 403);
      assert.match(outcome.nextError.message, /assigned branch/i);
    } finally {
      Student.findOne = originalFindOne;
    }
  });

  test('B3.33.4: Super Admin can view student profile across any branch', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: studentId,
      studentId: 'AET-BEL-2026-X1Y2',
      studentName: 'Belagavi Student',
      email: 'belagavi.student@example.com',
      branch: BRANCHES.BELAGAVI,
      isDeleted: false,
      toObject: () => ({ ...mockStudent }),
    };

    const originalFindOne = Student.findOne;
    Student.findOne = async () => mockStudent;

    try {
      const { req, res } = mockReqRes({
        params: { id: studentId.toString() },
        user: { role: ROLES.SUPER_ADMIN, branch: 'all' },
        branchScope: null,
      });

      const outcome = await invokeHandler(getStudentById, req, res);
      assert.strictEqual(outcome.nextError, null, 'Super Admin experiences no 403 error');
      assert.strictEqual(outcome.res.statusCode, 200);
      const studentData = outcome.res.body?.data?.student || outcome.res.body?.student;
      assert.strictEqual(studentData?.studentName, 'Belagavi Student');
    } finally {
      Student.findOne = originalFindOne;
    }
  });

  test('B3.33.5: Non-super user creating student with foreign branch is rejected with 403', async () => {
    const { req, res } = mockReqRes({
      body: {
        studentName: 'Sneha Rao',
        email: 'sneha.rao@example.com',
        branch: BRANCHES.BELAGAVI, // Foreign branch attempt
      },
      user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
    });

    const outcome = await invokeHandler(createStudent, req, res);
    assert.ok(outcome.nextError);
    assert.strictEqual(outcome.nextError.statusCode, 403);
    assert.match(outcome.nextError.message, /Unauthorized to create student in another branch/i);
  });
});

describe('Day 33: System-Managed Fields & Field-Level Allowlists', () => {
  test('B3.33.6: Tampering with system-managed fields on PATCH is rejected with 400', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: studentId,
      studentId: 'AET-BLR-2026-ORIG',
      studentName: 'Original Student',
      branch: BRANCHES.BENGALURU,
      isDeleted: false,
    };

    const originalFindOne = Student.findOne;
    Student.findOne = async () => mockStudent;

    try {
      // 1. Attempt to mutate studentId
      const { req: req1, res: res1 } = mockReqRes({
        params: { id: studentId.toString() },
        body: { studentId: 'AET-BLR-2026-HACKED' },
        user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      });

      const outcome1 = await invokeHandler(updateStudent, req1, res1);
      assert.ok(outcome1.nextError, 'studentId modification rejected');
      assert.strictEqual(outcome1.nextError.statusCode, 400);
      assert.match(outcome1.nextError.message, /System-managed fields cannot be modified directly/i);

      // 2. Attempt to mutate branch directly
      const { req: req2, res: res2 } = mockReqRes({
        params: { id: studentId.toString() },
        body: { branch: BRANCHES.MYSURU },
        user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      });

      const outcome2 = await invokeHandler(updateStudent, req2, res2);
      assert.ok(outcome2.nextError, 'branch modification rejected');
      assert.strictEqual(outcome2.nextError.statusCode, 400);
      assert.match(outcome2.nextError.message, /System-managed fields cannot be modified directly/i);

      // 3. Attempt to mutate conversionSource
      const { req: req3, res: res3 } = mockReqRes({
        params: { id: studentId.toString() },
        body: { conversionSource: { originalSource: 'fake' } },
        user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      });

      const outcome3 = await invokeHandler(updateStudent, req3, res3);
      assert.ok(outcome3.nextError, 'conversionSource modification rejected');
      assert.strictEqual(outcome3.nextError.statusCode, 400);
      assert.match(outcome3.nextError.message, /System-managed fields cannot be modified directly/i);
    } finally {
      Student.findOne = originalFindOne;
    }
  });

  test('B3.33.7: Counsellor cannot mutate administrative status or staff assignments (403)', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: studentId,
      studentId: 'AET-BLR-2026-1111',
      studentName: 'Student Name',
      branch: BRANCHES.BENGALURU,
      status: STUDENT_STATUS.ACTIVE,
      isDeleted: false,
    };

    const originalFindOne = Student.findOne;
    Student.findOne = async () => mockStudent;

    try {
      const { req, res } = mockReqRes({
        params: { id: studentId.toString() },
        body: { status: STUDENT_STATUS.ARCHIVED },
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      });

      const outcome = await invokeHandler(updateStudent, req, res);
      assert.ok(outcome.nextError, 'Counsellor modifying status is forbidden');
      assert.strictEqual(outcome.nextError.statusCode, 403);
      assert.match(outcome.nextError.message, /Only Branch Manager or Super Admin/i);
    } finally {
      Student.findOne = originalFindOne;
    }
  });

  test('B3.33.8: Direct student creation with system-managed fields is rejected with 400', async () => {
    const { req, res } = mockReqRes({
      body: {
        studentName: 'Tamper Attempt',
        email: 'tamper@example.com',
        studentId: 'MANUAL_ID_NOT_ALLOWED',
      },
      user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
      branchScope: BRANCHES.BENGALURU,
    });

    const outcome = await invokeHandler(createStudent, req, res);
    assert.ok(outcome.nextError);
    assert.strictEqual(outcome.nextError.statusCode, 400);
    assert.match(outcome.nextError.message, /System-managed fields cannot be provided during student creation/i);
  });
});

describe('Day 33: Field Projections & Role-Based Masking', () => {
  test('B3.33.9: Illegal fields in ?fields= parameter return 400 Bad Request', async () => {
    const { req, res } = mockReqRes({
      query: { fields: 'studentName,passwordHash,internalSecretToken' },
      user: { role: ROLES.SUPER_ADMIN, branch: 'all' },
    });

    const outcome = await invokeHandler(getStudents, req, res);
    assert.ok(outcome.nextError);
    assert.strictEqual(outcome.nextError.statusCode, 400);
    assert.match(outcome.nextError.message, /Invalid fields requested: passwordHash, internalSecretToken/i);
  });

  test('B3.33.10: Role-based field masking masks passport and sanitizes sponsor income for Counsellor', () => {
    const rawStudent = {
      studentId: 'AET-BLR-2026-TEST',
      studentName: 'Rohan Deshmukh',
      identity: {
        passport: {
          passportNumber: 'Z87654321',
          issuingCountry: 'India',
        },
      },
      financial: {
        annualBudget: 2500000,
        sponsorDetails: {
          name: 'Father',
          annualIncome: 1500000,
          occupation: 'Business',
        },
      },
    };

    // 1. Counsellor view: masked
    const counsellorView = applyRoleBasedMasking(rawStudent, ROLES.COUNSELLOR);
    assert.strictEqual(
      counsellorView.identity.passport.passportNumber,
      '****4321',
      'Passport number is masked to last 4 digits'
    );
    assert.strictEqual(
      counsellorView.financial.sponsorDetails.annualIncome,
      undefined,
      'Sponsor annual income is removed for Counsellor'
    );

    // 2. Branch Manager view: unmasked
    const managerView = applyRoleBasedMasking(rawStudent, ROLES.BRANCH_MANAGER);
    assert.strictEqual(managerView.identity.passport.passportNumber, 'Z87654321', 'Manager sees full passport');
    assert.strictEqual(managerView.financial.sponsorDetails.annualIncome, 1500000, 'Manager sees full sponsor income');
  });

  test('B3.33.11: Adding internal notes to timeline validates content and records author', async () => {
    const studentId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: studentId,
      studentId: 'AET-MYS-2026-7777',
      branch: BRANCHES.MYSURU,
      notes: [],
      isDeleted: false,
      save: async function () {
        return this;
      },
    };

    const originalFindOne = Student.findOne;
    Student.findOne = async () => mockStudent;

    try {
      const counsellorUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Ramesh Gowda',
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.MYSURU,
      };

      const { req, res } = mockReqRes({
        params: { id: studentId.toString() },
        body: { content: 'Student scored 7.0 in IELTS mock test. Ready for university shortlist.', category: 'counselling' },
        user: counsellorUser,
        branchScope: BRANCHES.MYSURU,
      });

      const outcome = await invokeHandler(addStudentNote, req, res);
      assert.strictEqual(outcome.nextError, null);
      assert.strictEqual(outcome.res.statusCode, 201);
      assert.strictEqual(mockStudent.notes.length, 1);
      assert.strictEqual(mockStudent.notes[0].authorName, 'Ramesh Gowda');
      assert.strictEqual(mockStudent.notes[0].category, 'counselling');
    } finally {
      Student.findOne = originalFindOne;
    }
  });
});
