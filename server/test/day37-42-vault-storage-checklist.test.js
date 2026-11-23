const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  validateFileMetadata,
  verifyFileMagicBytes,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_DOCUMENT_CATEGORIES,
} = require('../src/modules/vault/fileValidation');
const {
  buildStorageKey,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
  putObject,
  getObject,
} = require('../src/modules/vault/storage.service');
const {
  createUploadIntent,
  uploadDocument,
  getStudentDocuments,
  getDownloadUrl,
  getPreviewUrl,
  verifyDocument,
  softDeleteDocument,
} = require('../src/modules/vault/vault.controller');
const Student = require('../src/modules/students/student.model');
const Document = require('../src/modules/vault/document.model');
const DocumentAudit = require('../src/modules/vault/documentAudit.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');
const { ROLES, BRANCHES } = require('../src/config/constants');

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
    send(data) {
      this.sentData = data;
      return this;
    },
  };
  return res;
}

// Minimal valid binary buffers
const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal test content for student vault upload');
const VALID_PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const VALID_JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

describe('Day 37–42: Document Vault, Storage Security, Verification Gate & Audit Lifecycle', () => {
  describe('1. File & MIME Validation Engine (fileValidation.js)', () => {
    test('Valid PDF, JPEG, and PNG metadata pass validation', () => {
      assert.equal(
        validateFileMetadata({
          fileName: 'passport_scan.pdf',
          fileSize: 1024 * 500,
          mimeType: 'application/pdf',
          category: 'passport_identity',
        }).valid,
        true
      );
      assert.equal(
        validateFileMetadata({
          fileName: 'student_photo.jpg',
          fileSize: 1024 * 200,
          mimeType: 'image/jpeg',
          category: 'other',
        }).valid,
        true
      );
    });

    test('Path traversal in file name is rejected', () => {
      const res = validateFileMetadata({
        fileName: '../../etc/passwd.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /path traversal/i);
    });

    test('File size exceeding 10MB limit is rejected', () => {
      const res = validateFileMetadata({
        fileName: 'huge_scan.pdf',
        fileSize: MAX_FILE_SIZE_BYTES + 1,
        mimeType: 'application/pdf',
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /exceeds the maximum limit of 10MB/i);
    });

    test('Magic byte verification detects valid PDF, JPEG, PNG signatures', () => {
      assert.equal(verifyFileMagicBytes(VALID_PDF_BUFFER, 'application/pdf').valid, true);
      assert.equal(verifyFileMagicBytes(VALID_PNG_BUFFER, 'image/png').valid, true);
      assert.equal(verifyFileMagicBytes(VALID_JPEG_BUFFER, 'image/jpeg').valid, true);
    });

    test('MIME spoofing (plain text disguised as PDF) is rejected', () => {
      const fakePdf = Buffer.from('Hello world this is not a pdf');
      const res = verifyFileMagicBytes(fakePdf, 'application/pdf');
      assert.equal(res.valid, false);
      assert.match(res.error, /unrecognized or corrupt binary file signature/i);
    });

    test('MIME spoofing (PDF declared as JPEG) is rejected', () => {
      const res = verifyFileMagicBytes(VALID_PDF_BUFFER, 'image/jpeg');
      assert.equal(res.valid, false);
      assert.match(res.error, /MIME spoofing detected/i);
    });
  });

  describe('2. Storage Service & Signed Token Security (storage.service.js)', () => {
    test('buildStorageKey generates isolated branch/student namespace', () => {
      const key = buildStorageKey({
        branch: 'Bengaluru',
        studentId: 'AET-BLR-2026-X123',
        category: 'academic_transcripts',
        fileName: 'degree certificate.pdf',
      });
      assert.match(key, /^vault\/bengaluru\/AET-BLR-2026-X123\/academic_transcripts\/[0-9]+_[a-f0-9]+_degree_certificate\.pdf$/);
    });

    test('Signed download token verifies successfully within TTL', () => {
      const token = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
        disposition: 'attachment',
        ttlSeconds: 900,
      });

      const res = verifySignedDownloadToken(token);
      assert.equal(res.valid, true);
      assert.equal(res.payload.key, 'vault/bengaluru/TEST/doc.pdf');
      assert.equal(res.payload.disp, 'attachment');
    });

    test('Tampered token signature is strictly rejected', () => {
      const token = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
      });
      const parts = token.split('.');
      const tampered = `${parts[0]}.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`;

      const res = verifySignedDownloadToken(tampered);
      assert.equal(res.valid, false);
      assert.match(res.error, /invalid token signature/i);
    });

    test('Expired token (> 15 minutes TTL) fails verification', () => {
      const expiredToken = generateSignedDownloadToken({
        storageKey: 'vault/bengaluru/TEST/doc.pdf',
        fileName: 'doc.pdf',
        ttlSeconds: -10, // already expired in the past
      });

      const res = verifySignedDownloadToken(expiredToken);
      assert.equal(res.valid, false);
      assert.match(res.error, /has expired/i);
    });

    test('Local driver putObject and getObject write and retrieve binary buffer', async () => {
      const testKey = `vault/test/temp_${Date.now()}.pdf`;
      await putObject(testKey, VALID_PDF_BUFFER, 'application/pdf');

      const retrieved = await getObject(testKey);
      assert.deepEqual(retrieved, VALID_PDF_BUFFER);
    });
  });

  describe('3. Vault Controller & Document Verification Gate', () => {
    let mockStudent;
    let savedAudits = [];
    let savedDocs = [];

    beforeEach(() => {
      savedAudits = [];
      savedDocs = [];
      const studentId = new mongoose.Types.ObjectId();

      mockStudent = {
        _id: studentId,
        studentId: 'AET-BLR-2026-V100',
        studentName: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        branch: BRANCHES.BENGALURU,
      };

      Student.findOne = async (query) => {
        if (query._id && query._id.toString() === mockStudent._id.toString()) {
          return mockStudent;
        }
        return null;
      };

      DocumentAudit.create = async (doc) => {
        savedAudits.push(doc);
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };

      Document.findOne = async (query) => {
        return savedDocs.find((d) => d._id.toString() === query._id.toString() && !d.isDeleted) || null;
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

      PipelineStudent.updateMany = async () => ({ modifiedCount: 1 });

      Document.prototype.save = async function () {
        this._id = this._id || new mongoose.Types.ObjectId();
        savedDocs.push(this);
        return this;
      };
    });

    test('POST /upload-intent generates signed upload token and logs audit event', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          fileName: 'passport_front.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
          category: 'passport_identity',
          title: 'Passport Front & Back',
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(createUploadIntent, req, res);

      assert.equal(res.statusCode, 200);
      const data = res.payload?.data || res.payload;
      assert.ok(data.uploadToken);
      assert.match(data.storageKey, /vault\/bengaluru\/AET-BLR-2026-V100\/passport_identity/);
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'DOCUMENT_UPLOAD_INTENT');
    });

    test('POST /upload saves document to vault and checks magic bytes', async () => {
      const req = {
        params: { id: mockStudent._id.toString() },
        body: {
          title: 'Official Degree Transcript',
          fileName: 'transcript.pdf',
          fileSize: VALID_PDF_BUFFER.length,
          mimeType: 'application/pdf',
          category: 'academic_transcripts',
          fileBase64: VALID_PDF_BUFFER.toString('base64'),
        },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(uploadDocument, req, res);

      assert.equal(res.statusCode, 201);
      const data = res.payload?.data || res.payload;
      const createdDoc = data.document;
      assert.equal(createdDoc.isVerified, false);
      assert.equal(createdDoc.category, 'academic_transcripts');
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'DOCUMENT_UPLOADED');
    });

    test('PATCH /verify: Counsellor is strictly forbidden (403)', async () => {
      const docId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: docId,
        student: mockStudent._id,
        category: 'passport_identity',
        isVerified: false,
        isDeleted: false,
        save: async function () {
          return this;
        },
      };
      savedDocs.push(mockDoc);

      const req = {
        params: { id: mockStudent._id.toString(), docId: docId.toString() },
        body: { isVerified: true },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(verifyDocument, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /only branch manager, application officer, or super admin/i);
    });

    test('PATCH /verify: Application Officer verifies mandatory documents and syncs pipeline gate', async () => {
      // Create the 3 mandatory documents
      const doc1 = {
        _id: new mongoose.Types.ObjectId(),
        student: mockStudent._id,
        category: 'passport_identity',
        isVerified: true,
        isDeleted: false,
        save: async function () {
          return this;
        },
      };
      const doc2 = {
        _id: new mongoose.Types.ObjectId(),
        student: mockStudent._id,
        category: 'academic_transcripts',
        isVerified: true,
        isDeleted: false,
        save: async function () {
          return this;
        },
      };
      const doc3 = {
        _id: new mongoose.Types.ObjectId(),
        student: mockStudent._id,
        category: 'financial_affidavits',
        isVerified: false,
        save: async function () {
          return this;
        },
      };

      savedDocs.push(doc1, doc2, doc3);

      const req = {
        params: { id: mockStudent._id.toString(), docId: doc3._id.toString() },
        body: { isVerified: true, verificationNotes: 'Bank statement verified with branch seal' },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Vikram Officer', role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(verifyDocument, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(doc3.isVerified, true);
      const data = res.payload?.data || res.payload;
      assert.equal(data.isChecklistComplete, true);
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'DOCUMENT_VERIFIED');
    });

    test('DELETE /:docId: Counsellor cannot soft-delete document (403)', async () => {
      const docId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: docId,
        student: mockStudent._id,
        category: 'passport_identity',
        isDeleted: false,
      };
      savedDocs.push(mockDoc);

      const req = {
        params: { id: mockStudent._id.toString(), docId: docId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Pooja Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(softDeleteDocument, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /only branch manager or super admin/i);
    });

    test('DELETE /:docId: Branch Manager soft-deletes document and logs audit', async () => {
      const docId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: docId,
        student: mockStudent._id,
        category: 'other',
        fileName: 'old_resume.pdf',
        isDeleted: false,
        save: async function () {
          return this;
        },
      };
      savedDocs.push(mockDoc);

      const req = {
        params: { id: mockStudent._id.toString(), docId: docId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Ravi Manager', role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
      };
      const res = createMockRes();

      await invokeHandler(softDeleteDocument, req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockDoc.isDeleted, true);
      assert.equal(savedAudits.length, 1);
      assert.equal(savedAudits[0].action, 'DOCUMENT_SOFT_DELETED');
    });

    test('Cross-branch document download request is rejected (403)', async () => {
      const docId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: docId,
        student: mockStudent._id,
        category: 'passport_identity',
        fileName: 'passport.pdf',
        storageKey: 'vault/bengaluru/TEST/passport.pdf',
        isDeleted: false,
      };
      savedDocs.push(mockDoc);

      const req = {
        params: { id: mockStudent._id.toString(), docId: docId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), name: 'Mysuru Counsellor', role: ROLES.COUNSELLOR, branch: BRANCHES.MYSURU },
        branchScope: BRANCHES.MYSURU,
      };
      const res = createMockRes();

      await invokeHandler(getDownloadUrl, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.payload.message, /unauthorized to download documents for student outside your assigned branch/i);
    });
  });
});
