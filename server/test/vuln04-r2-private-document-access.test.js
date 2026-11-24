const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const { ROLES, BRANCHES } = require('../src/config/constants');
const {
  generateR2PresignedUrl,
  getPublicAssetUrl,
  isR2Configured,
  getR2ConfigSummary,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
} = require('../src/modules/vault/storage.service');

const Student = require('../src/modules/students/student.model');
const Document = require('../src/modules/vault/document.model');
const DocumentAudit = require('../src/modules/vault/documentAudit.model');
const {
  getDownloadUrl,
  getPreviewUrl,
} = require('../src/modules/vault/vault.controller');

function invokeHandler(handler, req, res) {
  return new Promise((resolve) => {
    const next = (err) => {
      resolve({ nextCalled: true, nextError: err || null, res });
    };

    const origJson = res.json ? res.json.bind(res) : null;
    res.json = (data) => {
      if (origJson) origJson(data);
      resolve({ nextCalled: false, nextError: null, res });
    };

    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(() => resolve({ nextCalled: false, nextError: null, res })).catch(next);
      }
    } catch (syncErr) {
      next(syncErr);
    }
  });
}

describe('VULN-04: Private Student Document R2 SigV4 & CDN Protection Suite', () => {
  const originalEnv = { ...process.env };

  const sampleStudentId = new mongoose.Types.ObjectId();
  const sampleDocId = new mongoose.Types.ObjectId();
  const staffBlrId = new mongoose.Types.ObjectId();
  const sampleStorageKey = 'vault/bengaluru/STD-2026-001/passport/1732000000_abcd1234_passport.pdf';

  beforeEach(() => {
    // Configure mock R2 credentials with a public CDN URL present to test bypass resistance
    process.env.R2_ACCOUNT_ID = 'test-r2-account-id-1234';
    process.env.R2_ACCESS_KEY_ID = 'test-r2-access-key-id-abcd';
    process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret-access-key-secure-64chars-long-string-value-here';
    process.env.R2_BUCKET_NAME = 'aeterna-one-private-vault';
    process.env.R2_PUBLIC_URL = 'https://cdn.aeterna.com';
    process.env.R2_CUSTOM_DOMAIN = 'https://vault-public.aeterna.com';
    process.env.STORAGE_SIGNING_SECRET = 'test-signing-secret-key-32chars-min!';
    process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-minimum!';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Private Document SigV4 Presigned URL Generation', () => {
    it('always generates private AWS SigV4 signed URL and NEVER leaks public CDN domain for vault documents', () => {
      const url = generateR2PresignedUrl(sampleStorageKey, { expiresIn: 900 });
      assert.ok(url);

      // Must NOT use public CDN or custom domain
      assert.equal(url.includes('cdn.aeterna.com'), false);
      assert.equal(url.includes('vault-public.aeterna.com'), false);

      // Must be an authenticated SigV4 URL pointing to the private R2 endpoint
      assert.ok(url.startsWith('https://test-r2-account-id-1234.r2.cloudflarestorage.com/aeterna-one-private-vault/'));
      assert.ok(url.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256'));
      assert.ok(url.includes('X-Amz-Credential='));
      assert.ok(url.includes('X-Amz-Date='));
      assert.ok(url.includes('X-Amz-Expires=900'));
      assert.ok(url.includes('X-Amz-Signature='));
    });

    it('strictly caps expiration TTL to a maximum of 900 seconds (15 minutes)', () => {
      // Caller requests an excessive 24-hour expiration (86400s)
      const url = generateR2PresignedUrl(sampleStorageKey, { expiresIn: 86400 });
      assert.ok(url);
      // Must be capped to 900 seconds
      assert.ok(url.includes('X-Amz-Expires=900'));
    });

    it('attaches response-content-disposition=attachment when disposition is attachment', () => {
      const url = generateR2PresignedUrl(sampleStorageKey, { expiresIn: 900, disposition: 'attachment' });
      assert.ok(url);
      assert.ok(url.includes('response-content-disposition=attachment'));
    });

    it('rejects path traversal attempts when generating presigned URL', () => {
      assert.throws(
        () => generateR2PresignedUrl('../../server/.env'),
        { code: 'EPATHTRAVERSAL', statusCode: 403 }
      );
    });

    it('returns null if R2 is not configured (triggering local storage driver)', () => {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;

      const url = generateR2PresignedUrl(sampleStorageKey);
      assert.equal(url, null);
    });
  });

  describe('2. Public Asset Workflow Isolation (getPublicAssetUrl)', () => {
    it('strictly refuses to resolve confidential vault documents via public CDN', () => {
      assert.throws(
        () => getPublicAssetUrl(sampleStorageKey),
        /Access denied: Confidential vault documents cannot be resolved via public CDN/
      );
      assert.throws(
        () => getPublicAssetUrl('vault/bengaluru/STD-01/passport/scan.pdf'),
        /Access denied: Confidential vault documents cannot be resolved via public CDN/
      );
    });

    it('refuses to resolve objects outside the public/ directory namespace', () => {
      assert.throws(
        () => getPublicAssetUrl('private/docs/secret.pdf'),
        /Access denied: Only objects within the public\/ namespace can be resolved via public CDN/
      );
    });

    it('allows resolving genuine public assets (logos, branding) in the public/ namespace', () => {
      const publicUrl = getPublicAssetUrl('public/branding/aeterna-logo.png');
      assert.equal(publicUrl, 'https://cdn.aeterna.com/public/branding/aeterna-logo.png');
    });
  });

  describe('3. Document Controller Authorization & Audit (getDownloadUrl / getPreviewUrl)', () => {
    let origStudentFindOne;
    let origDocFindOne;
    let origAuditCreate;

    beforeEach(() => {
      origStudentFindOne = Student.findOne;
      origDocFindOne = Document.findOne;
      origAuditCreate = DocumentAudit.create;

      Student.findOne = function () {
        return {
          _id: sampleStudentId,
          studentId: 'STD-2026-001',
          branch: BRANCHES.BENGALURU,
          isDeleted: false,
        };
      };

      Document.findOne = function () {
        return {
          _id: sampleDocId,
          student: sampleStudentId,
          fileName: 'passport_scan.pdf',
          mimeType: 'application/pdf',
          storageKey: sampleStorageKey,
          storageProvider: 'cloudflare_r2',
          isDeleted: false,
        };
      };

      DocumentAudit.create = async function () {
        return true;
      };
    });

    afterEach(() => {
      Student.findOne = origStudentFindOne;
      Document.findOne = origDocFindOne;
      DocumentAudit.create = origAuditCreate;
    });

    it('serves private SigV4 download URL with 15-minute expiration for authorized staff', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffBlrId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(sampleStudentId), docId: String(sampleDocId) },
      });

      const result = await invokeHandler(getDownloadUrl, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;

      assert.equal(data.expiresIn, 900);
      assert.equal(data.fileName, 'passport_scan.pdf');
      assert.ok(data.downloadUrl);
      // Download URL must be SigV4, never public CDN
      assert.ok(data.downloadUrl.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256'));
      assert.equal(data.downloadUrl.includes('cdn.aeterna.com'), false);
    });

    it('serves private SigV4 inline preview URL for authorized staff', async () => {
      const { req, res } = mockReqRes({
        user: { _id: staffBlrId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(sampleStudentId), docId: String(sampleDocId) },
      });

      const result = await invokeHandler(getPreviewUrl, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;

      assert.equal(data.expiresIn, 900);
      assert.ok(data.previewUrl);
      assert.ok(data.previewUrl.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256'));
      assert.equal(data.previewUrl.includes('cdn.aeterna.com'), false);
    });

    it('strictly denies cross-branch staff from generating download or preview URLs', async () => {
      const { req, res } = mockReqRes({
        // Mysuru counsellor attempting to access Bengaluru student document
        user: { _id: staffBlrId, name: 'Mysuru Staff', role: ROLES.COUNSELLOR, branch: BRANCHES.MYSURU },
        branchScope: BRANCHES.MYSURU,
        params: { id: String(sampleStudentId), docId: String(sampleDocId) },
      });

      const downloadResult = await invokeHandler(getDownloadUrl, req, res);
      assert.equal(downloadResult.nextCalled, true);
      assert.equal(downloadResult.nextError?.statusCode, 403);
      assert.match(downloadResult.nextError?.message, /outside your assigned branch/);

      const previewResult = await invokeHandler(getPreviewUrl, req, res);
      assert.equal(previewResult.nextCalled, true);
      assert.equal(previewResult.nextError?.statusCode, 403);
      assert.match(previewResult.nextError?.message, /outside your assigned branch/);
    });

    it('falls back seamlessly to local signed driver token when R2 is not configured', async () => {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;

      const { req, res } = mockReqRes({
        user: { _id: staffBlrId, name: 'Anita Rao', role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        branchScope: BRANCHES.BENGALURU,
        params: { id: String(sampleStudentId), docId: String(sampleDocId) },
      });

      const result = await invokeHandler(getDownloadUrl, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);
      const data = res.body?.data || res.body;

      assert.ok(data.downloadUrl);
      assert.ok(data.downloadUrl.startsWith('/api/v1/vault-storage/file?token='));
      const token = data.downloadUrl.split('token=')[1];
      const verified = verifySignedDownloadToken(token);
      assert.equal(verified.valid, true);
      assert.equal(verified.payload.key, sampleStorageKey);
    });
  });
});
