const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  validateTestScore,
  validateAcademicRecord,
} = require('../src/modules/students/academicValidation');
const {
  validateFileMetadata,
  verifyFileMagicBytes,
  ALLOWED_DOCUMENT_CATEGORIES,
  MAX_FILE_SIZE_BYTES,
} = require('../src/modules/vault/fileValidation');
const {
  buildStorageKey,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
} = require('../src/modules/vault/storage.service');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  addAcademicRecord,
  addTestScore,
  verifyTestScore,
  updateFinancial,
  updatePreferences,
  addApplication,
  updateApplication,
  applyRoleBasedMasking,
} = require('../src/modules/students/student.controller');
const {
  createUploadIntent,
  uploadDocument,
  getStudentDocuments,
  getDownloadUrl,
  getPreviewUrl,
  verifyDocument,
  softDeleteDocument,
  MANDATORY_GATE_CATEGORIES,
} = require('../src/modules/vault/vault.controller');
const { generateStudentId, convertLeadToStudent } = require('../src/modules/students/studentConversion.service');
const Student = require('../src/modules/students/student.model');
const Document = require('../src/modules/vault/document.model');
const DocumentAudit = require('../src/modules/vault/documentAudit.model');
const StudentAudit = require('../src/modules/students/studentAudit.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES, BRANCHES, TEST_SCORE_TYPES, STUDENT_STATUS } = require('../src/config/constants');

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
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    send(data) {
      this.sentData = data;
      return this;
    },
  };
  return res;
}

const VALID_PDF = Buffer.from('%PDF-1.4 Day 45 independent release verification artifact');
const VALID_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

describe('Day 45: Phase B3 Independent Review & Release Gate Suite', () => {
  let mockStudent;
  let savedStudentAudits = [];
  let savedDocAudits = [];
  let savedDocs = [];
  let linkedPipelineRecord;

  beforeEach(() => {
    savedStudentAudits = [];
    savedDocAudits = [];
    savedDocs = [];

    const studentId = new mongoose.Types.ObjectId();
    mockStudent = {
      _id: studentId,
      studentId: 'AET-BLR-2026-GATE',
      studentName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+919876543210',
      branch: BRANCHES.BENGALURU,
      status: STUDENT_STATUS.ACTIVE,
      identity: {
        passport: {
          passportNumber: 'Z87654321',
          issuingCountry: 'India',
        },
      },
      academics: {
        highestQualification: 'B.E. Computer Science',
        undergradCgpa: 8.8,
        activeBacklogs: 0,
        records: [],
      },
      testScores: {
        records: {
          id(subId) {
            return this._list.find((s) => s._id.toString() === subId.toString());
          },
          push(item) {
            item._id = item._id || new mongoose.Types.ObjectId();
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
      },
      financial: {
        annualBudget: 3000000,
        budgetCurrency: 'INR',
        fundingSource: 'undecided',
        loanStatus: 'planning',
        loanAmount: 0,
        sponsorDetails: {
          name: 'Rajesh Sharma',
          relationship: 'Father',
          annualIncome: 1500000,
        },
        visaRefusalHistory: {
          hasRefusal: false,
          refusalDetails: [],
        },
      },
      preferences: {
        destinationCountries: ['United Kingdom', 'Canada'],
        targetDegrees: ['Master of Science'],
        studyFields: ['Data Science'],
      },
      shortlist: [],
      applications: {
        id(appId) {
          return this._list.find((a) => a._id.toString() === appId.toString());
        },
        push(item) {
          item._id = item._id || new mongoose.Types.ObjectId();
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
      notes: [],
      save: async function () {
        return this;
      },
      toObject: function () {
        return JSON.parse(JSON.stringify(this));
      },
    };

    linkedPipelineRecord = {
      _id: new mongoose.Types.ObjectId(),
      studentName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      branch: BRANCHES.BENGALURU,
      stage: 'documents_complete',
      documentsVerified: false,
    };

    Student.findOne = async (query) => {
      if (query._id && query._id.toString() === mockStudent._id.toString()) {
        return mockStudent;
      }
      return null;
    };

    DocumentAudit.create = async (doc) => {
      savedDocAudits.push(doc);
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    StudentAudit.create = async (doc) => {
      savedStudentAudits.push(doc);
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    Document.findOne = async (query) => {
      return (
        savedDocs.find(
          (d) =>
            d._id.toString() === query._id.toString() &&
            (!query.student || d.student.toString() === query.student.toString()) &&
            !d.isDeleted
        ) || null
      );
    };

    Document.find = (query) => {
      const filtered = savedDocs.filter((d) => {
        if (query.student && d.student.toString() !== query.student.toString()) return false;
        if (query.isDeleted === false && d.isDeleted) return false;
        if (query.isVerified === true && !d.isVerified) return false;
        return true;
      });

      return {
        sort() {
          return Promise.resolve(filtered);
        },
        select() {
          return Promise.resolve(filtered);
        },
        then(resolve, reject) {
          return Promise.resolve(filtered).then(resolve, reject);
        },
      };
    };

    Document.prototype.save = async function () {
      this._id = this._id || new mongoose.Types.ObjectId();
      savedDocs.push(this);
      return this;
    };

    PipelineStudent.updateMany = async (filter, update) => {
      if (filter.email === linkedPipelineRecord.email) {
        if (update.$set && update.$set.documentsVerified !== undefined) {
          linkedPipelineRecord.documentsVerified = update.$set.documentsVerified;
        }
      }
      return { modifiedCount: 1 };
    };
  });

  describe('Gate 1: Student 360° Profile & Field-Level RBAC Masking', () => {
    test('B3.45.1: Counsellor receives masked passport and sanitized sponsor income', async () => {
      const masked = applyRoleBasedMasking(mockStudent, ROLES.COUNSELLOR);
      assert.equal(masked.identity.passport.passportNumber, '****4321');
      assert.equal(masked.financial.sponsorDetails.annualIncome, undefined);
      assert.equal(masked.financial.sponsorDetails.name, 'Rajesh Sharma');
    });

    test('B3.45.2: Branch Manager and Super Admin receive unmasked sensitive data', async () => {
      const unmasked = applyRoleBasedMasking(mockStudent, ROLES.BRANCH_MANAGER);
      assert.equal(unmasked.identity.passport.passportNumber, 'Z87654321');
      assert.equal(unmasked.financial.sponsorDetails.annualIncome, 1500000);
    });

    test('B3.45.3: System-managed fields cannot be tampered via profile update (400)', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: { studentId: 'TAMPERED-ID', branch: 'mysuru' },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(updateStudent, req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.payload.message, /system-managed fields cannot be modified directly/i);
    });
  });

  describe('Gate 2: Academic & Standardized Test Verification Engine', () => {
    test('B3.45.4: Test scores validate across IELTS, TOEFL, PTE, Duolingo, GRE, and GMAT', () => {
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.IELTS, overallScore: 7.5 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.TOEFL, overallScore: 105 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.PTE, overallScore: 68 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.DUOLINGO, overallScore: 135 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.GRE, overallScore: 324 }).valid, true);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.GMAT, overallScore: 710 }).valid, true);
    });

    test('B3.45.5: Invalid scores and inverted test dates are rejected', () => {
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.IELTS, overallScore: 7.3 }).valid, false);
      assert.equal(validateTestScore({ testType: TEST_SCORE_TYPES.TOEFL, overallScore: 130 }).valid, false);
      assert.equal(
        validateTestScore({
          testType: TEST_SCORE_TYPES.IELTS,
          overallScore: 7.0,
          testDate: '2026-06-01',
          validUntil: '2025-06-01',
        }).valid,
        false
      );
    });

    test('B3.45.6: Test score verification is strictly role-gated (Counsellor 403, Officer 200)', async () => {
      const scoreId = new mongoose.Types.ObjectId();
      mockStudent.testScores.records._list.push({
        _id: scoreId,
        testType: TEST_SCORE_TYPES.IELTS,
        overallScore: 7.5,
        isVerified: false,
      });

      // Counsellor attempt
      const reqCounsellor = {
        params: { id: mockStudent._id.toString(), scoreId: scoreId.toString() },
        body: { isVerified: true },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const resCounsellor = createMockRes();
      await invokeHandler(verifyTestScore, reqCounsellor, resCounsellor);
      assert.equal(resCounsellor.statusCode, 403);

      // Application Officer attempt
      const reqOfficer = {
        params: { id: mockStudent._id.toString(), scoreId: scoreId.toString() },
        body: { isVerified: true, trfNumber: 'TRF-BLR-00192' },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Vikram Officer', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const resOfficer = createMockRes();
      await invokeHandler(verifyTestScore, reqOfficer, resOfficer);
      assert.equal(resOfficer.statusCode, 200);
      assert.equal(mockStudent.testScores.records._list[0].isVerified, true);
    });
  });

  describe('Gate 3: Financial Capability & Manager Loan Approval Gate', () => {
    test('B3.45.7: Counsellor cannot sanction or disburse loan status (403)', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: { loanStatus: 'sanctioned', loanAmount: 2500000 },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(updateFinancial, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /only branch manager or super admin/i);
    });

    test('B3.45.8: Branch Manager sanctions loan with immutable audit log', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: { loanStatus: 'sanctioned', loanAmount: 2500000, annualBudget: 3500000 },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Ravi Manager', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(updateFinancial, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockStudent.financial.loanStatus, 'sanctioned');
      assert.ok(savedStudentAudits.some((a) => a.action === 'LOAN_SANCTION_UPDATED'));
    });
  });

  describe('Gate 4: Document Vault, Storage Security & Binary Magic Bytes', () => {
    test('B3.45.9: Upload proxy validates genuine PDF magic bytes and stores file', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          title: 'Official Degree Transcript',
          fileName: 'degree.pdf',
          fileSize: VALID_PDF.length,
          mimeType: 'application/pdf',
          category: 'academic_transcripts',
          fileBase64: VALID_PDF.toString('base64'),
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(uploadDocument, req, res);

      assert.equal(res.statusCode, 201);
      const doc = res.payload?.data?.document || res.payload?.document;
      assert.equal(doc.isVerified, false);
      assert.equal(savedDocAudits.length, 1);
      assert.equal(savedDocAudits[0].action, 'DOCUMENT_UPLOADED');
    });

    test('B3.45.10: Fake PDF with executable or plain text bytes is rejected', async () => {
      const fakeBuffer = Buffer.from('Plain text content masquerading as PDF');
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          title: 'Fake Document',
          fileName: 'fake.pdf',
          fileSize: fakeBuffer.length,
          mimeType: 'application/pdf',
          category: 'academic_transcripts',
          fileBase64: fakeBuffer.toString('base64'),
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(uploadDocument, req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.payload.message, /unrecognized or corrupt binary file signature/i);
    });

    test('B3.45.11: Download tokens use HMAC-SHA256 signature and expire after 15m', () => {
      const token = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
        ttlSeconds: 900,
      });
      assert.equal(verifySignedDownloadToken(token).valid, true);

      // Tampered signature
      const [payload] = token.split('.');
      assert.equal(verifySignedDownloadToken(`${payload}.badsignature`).valid, false);

      // Expired token
      const expired = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
        ttlSeconds: -10,
      });
      assert.equal(verifySignedDownloadToken(expired).valid, false);
    });
  });

  describe('Gate 5: Document Verification Gate & Pipeline Synchronization', () => {
    test('B3.45.12: Mandatory checklist completion unlocks PipelineStudent.documentsVerified', async () => {
      // Create mandatory docs
      const docPassport = {
        _id: new mongoose.Types.ObjectId(),
        student: mockStudent._id,
        category: 'passport_identity',
        isVerified: true,
        isDeleted: false,
        save: async function () { return this; },
      };
      const docAcademics = {
        _id: new mongoose.Types.ObjectId(),
        student: mockStudent._id,
        category: 'academic_transcripts',
        isVerified: true,
        isDeleted: false,
        save: async function () { return this; },
      };
      const docFinancial = {
        _id: new mongoose.Types.ObjectId(),
        student: mockStudent._id,
        category: 'financial_affidavits',
        isVerified: false,
        isDeleted: false,
        save: async function () { return this; },
      };

      savedDocs.push(docPassport, docAcademics, docFinancial);

      // Officer verifies financial doc (completing all 3 mandatory categories)
      const req = {
        params: { id: mockStudent._id.toString(), docId: docFinancial._id.toString() },
        body: { isVerified: true, verificationNotes: 'Bank balance certificate confirmed' },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Vikram Officer', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(verifyDocument, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(docFinancial.isVerified, true);
      assert.equal(linkedPipelineRecord.documentsVerified, true);
    });
  });

  describe('Gate 6: Cross-Branch Containment & IDOR Protection', () => {
    test('B3.45.13: Mysuru user cannot access Bengaluru student vault (403)', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Kiran Staff', role: ROLES.COUNSELLOR, branch: BRANCHES.MYSURU },
        branchScope: BRANCHES.MYSURU,
      };
      const res = createMockRes();

      await invokeHandler(getStudentDocuments, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /unauthorized to view documents for student outside your assigned branch/i);
    });

    test('B3.45.14: Soft-deletion is restricted to Super Admin & Manager; preserves audit log', async () => {
      const docId = new mongoose.Types.ObjectId();
      const doc = {
        _id: docId,
        student: mockStudent._id,
        category: 'other',
        fileName: 'old_cv.pdf',
        isDeleted: false,
        save: async function () { return this; },
      };
      savedDocs.push(doc);

      // Counsellor attempt rejected
      const reqCounsellor = {
        params: { id: mockStudent._id.toString(), docId: docId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const resCounsellor = createMockRes();
      await invokeHandler(softDeleteDocument, reqCounsellor, resCounsellor);
      assert.equal(resCounsellor.statusCode, 403);

      // Manager attempt succeeds
      const reqManager = {
        params: { id: mockStudent._id.toString(), docId: docId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Ravi Manager', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const resManager = createMockRes();
      await invokeHandler(softDeleteDocument, reqManager, resManager);
      assert.equal(resManager.statusCode, 200);
      assert.equal(doc.isDeleted, true);
      assert.ok(savedDocAudits.some((a) => a.action === 'DOCUMENT_SOFT_DELETED'));
    });
  });
});
