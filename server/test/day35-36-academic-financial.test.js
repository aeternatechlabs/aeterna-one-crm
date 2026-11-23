const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  validateTestScore,
  validateAcademicRecord,
} = require('../src/modules/students/academicValidation');
const {
  addAcademicRecord,
  addTestScore,
  verifyTestScore,
  updateFinancial,
  updatePreferences,
} = require('../src/modules/students/student.controller');
const Student = require('../src/modules/students/student.model');
const StudentAudit = require('../src/modules/students/studentAudit.model');
const { ROLES, BRANCHES, TEST_SCORE_TYPES } = require('../src/config/constants');

// Test helper to invoke asyncHandler controllers reliably
function invokeHandler(handler, req, res) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    const next = (err) => {
      if (err) {
        res.errorCaptured = err;
        res.statusCode = err.statusCode || 500;
        res.json({ success: false, message: err.message, statusCode: res.statusCode });
      }
      finish();
    };

    const origJson = res.json.bind(res);
    res.json = (body) => {
      res.sentJson = body;
      origJson(body);
      finish();
      return res;
    };

    try {
      const p = handler(req, res, next);
      if (p && typeof p.then === 'function') {
        p.catch(next);
      }
    } catch (err) {
      next(err);
    }
  });
}

function createMockRes() {
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  return res;
}

describe('Day 35 & Day 36: Academic, Standardized Tests & Financial Engine', () => {
  describe('1. Test Score Format Validator (academicValidation.js)', () => {
    test('Valid IELTS score passes validation', () => {
      const validIelts = {
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.5,
        subScores: { reading: 7.5, writing: 7.0, speaking: 7.0, listening: 8.0 },
        testDate: '2025-10-01',
        validUntil: '2027-10-01',
      };
      const res = validateTestScore(validIelts);
      assert.equal(res.valid, true);
    });

    test('Invalid IELTS band increments (e.g. 7.2) fail validation', () => {
      const invalidIelts = {
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.2,
      };
      const res = validateTestScore(invalidIelts);
      assert.equal(res.valid, false);
      assert.match(res.error, /half-band increments/i);
    });

    test('IELTS score exceeding 9.0 fails validation', () => {
      const invalidIelts = {
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 9.5,
      };
      const res = validateTestScore(invalidIelts);
      assert.equal(res.valid, false);
      assert.match(res.error, /between 0.0 and 9.0/i);
    });

    test('Valid TOEFL iBT score (integer 0-120) passes', () => {
      const validToefl = {
        testType: TEST_SCORE_TYPES.TOEFL,
        overallScore: 104,
        subScores: { reading: 27, writing: 26, speaking: 25, listening: 26 },
      };
      const res = validateTestScore(validToefl);
      assert.equal(res.valid, true);
    });

    test('Float or out-of-range TOEFL score fails validation', () => {
      const floatToefl = {
        testType: TEST_SCORE_TYPES.TOEFL,
        overallScore: 104.5,
      };
      assert.equal(validateTestScore(floatToefl).valid, false);

      const highToefl = {
        testType: TEST_SCORE_TYPES.TOEFL,
        overallScore: 125,
      };
      assert.equal(validateTestScore(highToefl).valid, false);
    });

    test('Duolingo score requires multiples of 5 between 10 and 160', () => {
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.DUOLINGO, overallScore: 125 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.DUOLINGO, overallScore: 123 }).valid, false);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.DUOLINGO, overallScore: 165 }).valid, false);
    });

    test('GRE General score requires integer between 260 and 340', () => {
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.GRE, overallScore: 320 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.GRE, overallScore: 250 }).valid, false);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.GRE, overallScore: 350 }).valid, false);
    });

    test('Test score validity date must be chronologically after test date', () => {
      const invertedDates = {
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.0,
        testDate: '2026-05-01',
        validUntil: '2025-05-01',
      };
      const res = validateTestScore(invertedDates);
      assert.equal(res.valid, false);
      assert.match(res.error, /expiry date must be after the test date/i);
    });
  });

  describe('2. Academic Qualification Validator (academicValidation.js)', () => {
    test('Valid academic qualification passes', () => {
      const valid = {
        level: 'bachelors',
        institution: 'RV College of Engineering',
        boardOrUniversity: 'VTU',
        yearOfPassing: 2024,
        score: '8.4',
        gradingSystem: 'cgpa_10',
      };
      assert.equal(validateAcademicRecord(valid).valid, true);
    });

    test('Invalid qualification level fails', () => {
      const invalid = { level: 'kindergarten' };
      assert.equal(validateAcademicRecord(invalid).valid, false);
    });

    test('Out of bounds percentage score fails', () => {
      const invalid = { level: 'twelfth', gradingSystem: 'percentage', score: '105' };
      assert.equal(validateAcademicRecord(invalid).valid, false);
    });

    test('Out of bounds CGPA (10-point) fails', () => {
      const invalid = { level: 'bachelors', gradingSystem: 'cgpa_10', score: '11.5' };
      assert.equal(validateAcademicRecord(invalid).valid, false);
    });
  });

  describe('3. Controller & Subdocument CRUD with Audit Logging', () => {
    let mockStudent;
    let savedAudits = [];

    beforeEach(() => {
      savedAudits = [];
      const studentId = new mongoose.Types.ObjectId();

      mockStudent = {
        _id: studentId,
        studentId: 'AET-BLR-2026-T999',
        studentName: 'Sumanth Gowda',
        branch: BRANCHES.BENGALURU,
        academics: {
          highestQualification: '',
          undergradCgpa: 0,
          records: [],
        },
        testScores: {
          records: {
            id(subId) {
              return this._list.find((s) => s._id.toString() === subId.toString());
            },
            push(item) {
              item._id = new mongoose.Types.ObjectId();
              this._list.push(item);
            },
            _list: [],
            [Symbol.iterator]() {
              return this._list[Symbol.iterator]();
            },
            get length() {
              return this._list.length;
            },
            0: undefined,
          },
        },
        financial: {
          annualBudget: 2500000,
          budgetCurrency: 'INR',
          fundingSource: 'undecided',
          loanStatus: 'planning',
          loanAmount: 0,
        },
        preferences: {
          destinationCountries: ['UK', 'Ireland'],
          targetDegrees: ['Master of Science'],
          studyFields: ['Computer Science'],
        },
        applications: {
          id(appId) {
            return this._list.find((a) => a._id.toString() === appId.toString());
          },
          push(item) {
            item._id = new mongoose.Types.ObjectId();
            this._list.push(item);
          },
          _list: [],
          [Symbol.iterator]() {
            return this._list[Symbol.iterator]();
          },
          get length() {
            return this._list.length;
          },
        },
        async save() {
          return this;
        },
      };

      // Mock Student.findOne
      Student.findOne = async (query) => {
        if (query._id && query._id.toString() === mockStudent._id.toString()) {
          return mockStudent;
        }
        return null;
      };

      // Mock StudentAudit.create
      StudentAudit.create = async (doc) => {
        savedAudits.push(doc);
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };
    });

    test('POST /api/v1/students/:id/academics adds record and creates audit entry', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          level: 'bachelors',
          institution: 'BMS College of Engineering',
          yearOfPassing: 2024,
          score: '8.7',
          gradingSystem: 'cgpa_10',
          highestQualification: 'B.E. Computer Science',
          undergradCgpa: 8.7,
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(addAcademicRecord, req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(mockStudent.academics.records.length, 1);
      assert.equal(mockStudent.academics.highestQualification, 'B.E. Computer Science');
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'ACADEMIC_RECORD_ADDED');
      assert.equal(savedAudits[0].actorRole, ROLES.COUNSELLOR);
    });

    test('POST /api/v1/students/:id/test-scores validates score and creates audit entry', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          testType: TEST_SCORE_TYPES.IELTS,
          overallScore: 7.5,
          subScores: { reading: 8.0, writing: 7.0, speaking: 7.5, listening: 7.5 },
          trfNumber: '25IN001234GOBS101A',
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(addTestScore, req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(mockStudent.testScores.records._list.length, 1);
      assert.equal(mockStudent.testScores.records._list[0].isVerified, false);
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'TEST_SCORE_ADDED');
    });

    test('PATCH /api/v1/students/:id/test-scores/:scoreId/verify: Counsellor is forbidden (403)', async () => {
      const scoreId = new mongoose.Types.ObjectId();
      mockStudent.testScores.records._list.push({
        _id: scoreId,
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.0,
        isVerified: false,
      });

      const req = {
        params: { id: mockStudent._id.toString(), scoreId: scoreId.toString() },
        body: { isVerified: true },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(verifyTestScore, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /only branch manager, application officer, or super admin/i);
    });

    test('PATCH /api/v1/students/:id/test-scores/:scoreId/verify: Application Officer verifies score successfully', async () => {
      const scoreId = new mongoose.Types.ObjectId();
      mockStudent.testScores.records._list.push({
        _id: scoreId,
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.0,
        isVerified: false,
      });

      const req = {
        params: { id: mockStudent._id.toString(), scoreId: scoreId.toString() },
        body: { isVerified: true, trfNumber: 'TRF-VERIFIED-999' },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Vikram Officer', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(verifyTestScore, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockStudent.testScores.records._list[0].isVerified, true);
      assert.equal(mockStudent.testScores.records._list[0].trfNumber, 'TRF-VERIFIED-999');
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'TEST_SCORE_VERIFIED');
    });

    test('PATCH /api/v1/students/:id/financial: Counsellor cannot sanction loan (403)', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          loanStatus: 'sanctioned',
          loanAmount: 3000000,
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(updateFinancial, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /only branch manager or super admin can mark loan status as sanctioned/i);
    });

    test('PATCH /api/v1/students/:id/financial: Branch Manager sanctions loan with audit event', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          annualBudget: 3500000,
          budgetCurrency: 'GBP',
          loanStatus: 'sanctioned',
          loanAmount: 2500000,
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Ravi Manager', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(updateFinancial, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockStudent.financial.annualBudget, 3500000);
      assert.equal(mockStudent.financial.budgetCurrency, 'GBP');
      assert.equal(mockStudent.financial.loanStatus, 'sanctioned');
      assert.equal(savedAudits.length, 2); // FINANCIAL_BUDGET_UPDATED and LOAN_SANCTION_UPDATED
    });

    test('Cross-branch financial update is rejected (403)', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: { annualBudget: 4000000 },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Mysuru Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.MYSURU },
        branchScope: BRANCHES.MYSURU,
      };
      const res = createMockRes();

      await invokeHandler(updateFinancial, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /unauthorized to modify student record outside your assigned branch/i);
    });
  });
});
