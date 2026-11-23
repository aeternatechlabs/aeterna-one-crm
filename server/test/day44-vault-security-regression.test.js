const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  validateFileMetadata,
  verifyFileMagicBytes,
  MAX_FILE_SIZE_BYTES,
} = require('../src/modules/vault/fileValidation');
const {
  generateSignedDownloadToken,
  verifySignedDownloadToken,
} = require('../src/modules/vault/storage.service');
const {
  createUploadIntent,
  uploadDocument,
  getDownloadUrl,
  getPreviewUrl,
  verifyDocument,
  softDeleteDocument,
} = require('../src/modules/vault/vault.controller');
const {
  addApplication,
  updateApplication,
} = require('../src/modules/students/student.controller');
const Student = require('../src/modules/students/student.model');
const Document = require('../src/modules/vault/document.model');
const DocumentAudit = require('../src/modules/vault/documentAudit.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES, BRANCHES } = require('../src/config/constants');

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
    setHeader(key, val) {
      this.headers[key] = val;
    },
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

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 sample payload for Day 44 regression security suite');

describe('Day 43 & Day 44: Applications Integration, Vault Security & Privacy Regression Suite', () => {
  let studentBengaluru;
  let studentMysuru;
  let savedAudits = [];
  let savedDocs = [];

  beforeEach(() => {
    savedAudits = [];
    savedDocs = [];

    studentBengaluru = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'AET-BLR-2026-REG1',
      studentName: 'Bengaluru Student',
      email: 'blr.student@example.com',
      branch: BRANCHES.BENGALURU,
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
      save: async function () {
        return this;
      },
    };

    studentMysuru = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'AET-MYS-2026-REG2',
      studentName: 'Mysuru Student',
      email: 'mys.student@example.com',
      branch: BRANCHES.MYSURU,
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
      save: async function () {
        return this;
      },
    };

    Student.findOne = async (query) => {
      if (!query._id) return null;
      const targetId = query._id.toString();
      if (targetId === studentBengaluru._id.toString()) return studentBengaluru;
      if (targetId === studentMysuru._id.toString()) return studentMysuru;
      return null;
    };

    DocumentAudit.create = async (doc) => {
      savedAudits.push(doc);
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
        select() {
          return Promise.resolve(filtered);
        },
        sort() {
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

    PipelineStudent.updateMany = async () => ({ modifiedCount: 1 });
  });

  describe('1. Day 43: Multi-University Application Lifecycle Integration', () => {
    test('POST /api/v1/students/:id/applications adds target university application', async () => {
      const req = {
        params: { id: studentBengaluru._id.toString() },
        body: {
          universityName: 'University of Oxford',
          programme: 'MSc Advanced Computer Science',
          country: 'United Kingdom',
          portalApplicationId: 'OX-2026-CS-091',
          status: 'submitted',
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(addApplication, req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(studentBengaluru.applications.length, 1);
      assert.equal(studentBengaluru.applications._list[0].universityName, 'University of Oxford');
      assert.equal(studentBengaluru.applications._list[0].status, 'submitted');
    });

    test('PATCH /api/v1/students/:id/applications/:appId updates offer and visa progress', async () => {
      const appId = new mongoose.Types.ObjectId();
      studentBengaluru.applications._list.push({
        _id: appId,
        universityName: 'Imperial College London',
        programme: 'MSc Computing',
        country: 'United Kingdom',
        status: 'submitted',
      });

      const req = {
        params: { id: studentBengaluru._id.toString(), appId: appId.toString() },
        body: {
          status: 'unconditional_offer',
          casI20Number: 'CAS-ICL-987654',
          offerLetterDate: new Date('2026-03-15'),
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Vikram Officer', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(updateApplication, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(studentBengaluru.applications._list[0].status, 'unconditional_offer');
      assert.equal(studentBengaluru.applications._list[0].casI20Number, 'CAS-ICL-987654');
    });
  });

  describe('2. Day 44: IDOR (Insecure Direct Object Reference) Protection', () => {
    test('IDOR: Attempting to download Student B document via Student A URL is rejected (404/403)', async () => {
      // Document belongs to Mysuru student
      const mysuruDocId = new mongoose.Types.ObjectId();
      savedDocs.push({
        _id: mysuruDocId,
        student: studentMysuru._id,
        category: 'financial_affidavits',
        fileName: 'bank_statement.pdf',
        storageKey: 'vault/mysuru/AET-MYS-2026-REG2/bank.pdf',
        isDeleted: false,
      });

      // User tries to access via studentBengaluru ID in URL path
      const req = {
        params: { id: studentBengaluru._id.toString(), docId: mysuruDocId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(getDownloadUrl, req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.payload.message, /document record not found/i);
    });
  });

  describe('3. Day 44: Multi-Branch Containment Regression', () => {
    test('Mysuru staff cannot create upload intent for Bengaluru student (403)', async () => {
      const req = {
        params: { id: studentBengaluru._id.toString() },
        body: {
          fileName: 'passport.pdf',
          fileSize: 1024 * 100,
          mimeType: 'application/pdf',
          category: 'passport_identity',
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Kiran Mysuru Staff', role: ROLES.COUNSELLOR, branch: BRANCHES.MYSURU },
        branchScope: BRANCHES.MYSURU,
      };
      const res = createMockRes();

      await invokeHandler(createUploadIntent, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /unauthorized to upload documents for student outside your assigned branch/i);
    });

    test('Mysuru staff cannot verify Bengaluru student document (403)', async () => {
      const docId = new mongoose.Types.ObjectId();
      savedDocs.push({
        _id: docId,
        student: studentBengaluru._id,
        category: 'passport_identity',
        isVerified: false,
        isDeleted: false,
      });

      const req = {
        params: { id: studentBengaluru._id.toString(), docId: docId.toString() },
        body: { isVerified: true },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Mysuru Officer', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.MYSURU },
        branchScope: BRANCHES.MYSURU,
      };
      const res = createMockRes();

      await invokeHandler(verifyDocument, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /unauthorized to verify documents for student outside your assigned branch/i);
    });
  });

  describe('4. Day 44: Adversarial MIME Spoofing & Oversized File Rejection', () => {
    test('Executable file masquerading as PDF is rejected', () => {
      const exeHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ executable signature
      const res = verifyFileMagicBytes(exeHeader, 'application/pdf');
      assert.equal(res.valid, false);
      assert.match(res.error, /unrecognized or corrupt binary file signature/i);
    });

    test('Dangerous script extension (.sh) declared as PDF is rejected', () => {
      const res = validateFileMetadata({
        fileName: 'malicious.sh',
        fileSize: 500,
        mimeType: 'application/pdf',
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /does not match declared MIME type/i);
    });

    test('Oversized file (11MB > 10MB limit) is rejected', () => {
      const res = validateFileMetadata({
        fileName: 'huge_scan.pdf',
        fileSize: 11 * 1024 * 1024,
        mimeType: 'application/pdf',
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /exceeds the maximum limit of 10MB/i);
    });
  });

  describe('5. Day 44: Token Tampering & Expiry Anti-Replay', () => {
    test('Tampered token payload returns 403 signature mismatch', () => {
      const token = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
      });
      const [payload, sig] = token.split('.');

      // Alter payload slightly
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      decoded.key = 'vault/bengaluru/ANOTHER/stolen.pdf';
      const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');

      const tamperedToken = `${tamperedPayload}.${sig}`;
      const res = verifySignedDownloadToken(tamperedToken);

      assert.equal(res.valid, false);
      assert.match(res.error, /invalid token signature/i);
    });

    test('Expired token returns 403 expired error', () => {
      const expiredToken = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
        ttlSeconds: -60,
      });

      const res = verifySignedDownloadToken(expiredToken);
      assert.equal(res.valid, false);
      assert.match(res.error, /has expired/i);
    });
  });

  describe('6. Day 44: Audit Trail Immutability Verification', () => {
    test('Soft-deletion logs DOCUMENT_SOFT_DELETED audit event and preserves record', async () => {
      const docId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: docId,
        student: studentBengaluru._id,
        category: 'other',
        fileName: 'draft_cv.pdf',
        isDeleted: false,
        save: async function () {
          return this;
        },
      };
      savedDocs.push(mockDoc);

      const req = {
        params: { id: studentBengaluru._id.toString(), docId: docId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Ravi Manager', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(softDeleteDocument, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockDoc.isDeleted, true);
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'DOCUMENT_SOFT_DELETED');
      assert.equal(savedAudits[0].details.documentId.toString(), docId.toString());
    });
  });
});
