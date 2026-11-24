const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  STORAGE_ROOT_DIR,
  resolveSecureStoragePath,
  getStorageSigningSecret,
  buildStorageKey,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
  putObject,
  getObject,
  deleteObject,
  isR2Configured,
  getR2ConfigSummary,
} = require('../src/modules/vault/storage.service');

const { serveStorageFile } = require('../src/modules/vault/vault.controller');

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
        res.body = { success: false, message: err.message, statusCode: res.statusCode };
      }
      finish();
    };

    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
    res.json = function (data) {
      this.body = data;
      finish();
      return this;
    };
    res.send = function (data) {
      this.sentData = data;
      finish();
      return this;
    };
    res.setHeader = function (name, value) {
      this.headers = this.headers || {};
      this.headers[name] = value;
      return this;
    };

    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(() => finish()).catch(next);
      }
    } catch (err) {
      next(err);
    }
  });
}

describe('VULN-01: Vault Storage Path Traversal & Signing Secret Security Suite', () => {
  const originalEnvStorageSecret = process.env.STORAGE_SIGNING_SECRET;
  const originalEnvJwtSecret = process.env.JWT_SECRET;
  const testKey = 'vault/bengaluru/TEST-STUDENT-01/passport/test_scan.pdf';
  const testContent = Buffer.from('%PDF-1.4 Mock Encrypted Student Document for Aeterna One CRM Vault');

  beforeEach(() => {
    process.env.STORAGE_SIGNING_SECRET = 'test-audit-storage-signing-secret-key-32chars!';
    process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-minimum!';
  });

  afterEach(async () => {
    process.env.STORAGE_SIGNING_SECRET = originalEnvStorageSecret;
    process.env.JWT_SECRET = originalEnvJwtSecret;

    // Cleanup test file if created
    try {
      await deleteObject(testKey);
    } catch {
      // Ignore
    }
  });

  describe('1. Signing Secret Fail-Closed Enforcement', () => {
    it('returns configured STORAGE_SIGNING_SECRET when available', () => {
      process.env.STORAGE_SIGNING_SECRET = 'custom-dedicated-vault-secret';
      const secret = getStorageSigningSecret();
      assert.equal(secret, 'custom-dedicated-vault-secret');
    });

    it('falls back to JWT_SECRET if STORAGE_SIGNING_SECRET is omitted', () => {
      delete process.env.STORAGE_SIGNING_SECRET;
      process.env.JWT_SECRET = 'fallback-jwt-secret';
      const secret = getStorageSigningSecret();
      assert.equal(secret, 'fallback-jwt-secret');
    });

    it('throws fail-closed error if neither STORAGE_SIGNING_SECRET nor JWT_SECRET is configured', () => {
      delete process.env.STORAGE_SIGNING_SECRET;
      delete process.env.JWT_SECRET;

      assert.throws(
        () => getStorageSigningSecret(),
        /Server configuration error: STORAGE_SIGNING_SECRET is not configured/
      );
    });

    it('does not fall back to any hardcoded default password string', () => {
      delete process.env.STORAGE_SIGNING_SECRET;
      delete process.env.JWT_SECRET;

      try {
        getStorageSigningSecret();
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.ok(!err.message.includes('aeterna-vault-storage-signing-secret-key-2026'));
        assert.match(err.message, /Local signed storage requires a secure signing secret/);
      }
    });
  });

  describe('2. Path Traversal & Containment Validation (resolveSecureStoragePath)', () => {
    it('successfully resolves valid safe storage keys inside STORAGE_ROOT_DIR', () => {
      const resolved = resolveSecureStoragePath('vault/bengaluru/STD-01/passport/sample.pdf');
      const normalizedRoot = path.resolve(STORAGE_ROOT_DIR);
      assert.ok(resolved.startsWith(normalizedRoot + path.sep));
      assert.ok(resolved.endsWith('sample.pdf'));
    });

    it('rejects empty or non-string storage keys', () => {
      assert.throws(() => resolveSecureStoragePath(''), { code: 'EPATHTRAVERSAL', statusCode: 400 });
      assert.throws(() => resolveSecureStoragePath(null), { code: 'EPATHTRAVERSAL', statusCode: 400 });
      assert.throws(() => resolveSecureStoragePath(undefined), { code: 'EPATHTRAVERSAL', statusCode: 400 });
    });

    it('rejects null byte injection in storage keys', () => {
      assert.throws(
        () => resolveSecureStoragePath('vault/bengaluru/STD-01/passport/sample.pdf\0.jpg'),
        { code: 'EPATHTRAVERSAL', statusCode: 400 }
      );
    });

    it('rejects absolute paths (Unix and Windows drive letters)', () => {
      assert.throws(() => resolveSecureStoragePath('/etc/passwd'), { code: 'EPATHTRAVERSAL', statusCode: 403 });
      assert.throws(() => resolveSecureStoragePath('C:\\Windows\\System32\\calc.exe'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
      assert.throws(() => resolveSecureStoragePath('D:/devil_code/server/.env'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
      assert.throws(() => resolveSecureStoragePath('\\\\127.0.0.1\\c$\\secret.txt'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
    });

    it('rejects relative path traversal sequences (.. / ..\\)', () => {
      assert.throws(() => resolveSecureStoragePath('../package.json'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
      assert.throws(() => resolveSecureStoragePath('..\\package.json'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
      assert.throws(() => resolveSecureStoragePath('vault/../../../package.json'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
      assert.throws(() => resolveSecureStoragePath('vault/delhi/..\\..\\..\\server\\.env'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
    });

    it('rejects URL-encoded path traversal sequences', () => {
      assert.throws(() => resolveSecureStoragePath('%2e%2e%2f%2e%2e%2fpackage.json'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
      assert.throws(() => resolveSecureStoragePath('vault%2f..%2f..%2f.env'), {
        code: 'EPATHTRAVERSAL',
        statusCode: 403,
      });
    });

    it('prevents symlink escapes pointing outside STORAGE_ROOT_DIR', () => {
      const escapeTarget = path.resolve(__dirname, '../package.json');
      const symlinkPath = path.resolve(STORAGE_ROOT_DIR, 'malicious_symlink_test.json');

      try {
        // Try creating symlink if permissions allow
        fs.symlinkSync(escapeTarget, symlinkPath);

        assert.throws(
          () => resolveSecureStoragePath('malicious_symlink_test.json'),
          { code: 'EPATHTRAVERSAL', statusCode: 403 }
        );
      } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EACCES') {
          // Windows non-admin privileges may disallow symlink creation in test sandbox
          // The symlink verification logic in code is confirmed via fs.realpathSync
          return;
        }
        throw err;
      } finally {
        if (fs.existsSync(symlinkPath)) {
          try {
            fs.unlinkSync(symlinkPath);
          } catch {}
        }
      }
    });
  });

  describe('3. Signed Download Token Integrity & Security', () => {
    it('generates a valid signed token for legitimate storage keys', () => {
      const token = generateSignedDownloadToken({
        storageKey: testKey,
        fileName: 'test_scan.pdf',
        disposition: 'attachment',
        ttlSeconds: 900,
      });

      assert.ok(typeof token === 'string');
      assert.ok(token.includes('.'));

      const result = verifySignedDownloadToken(token);
      assert.equal(result.valid, true);
      assert.equal(result.payload.key, testKey);
      assert.equal(result.payload.name, 'test_scan.pdf');
      assert.equal(result.payload.disp, 'attachment');
      assert.ok(result.payload.exp > Date.now());
    });

    it('rejects token generation if storage key contains path traversal', () => {
      assert.throws(
        () =>
          generateSignedDownloadToken({
            storageKey: '../../server/.env',
            fileName: '.env',
          }),
        { code: 'EPATHTRAVERSAL', statusCode: 403 }
      );
    });

    it('rejects tampered token signature', () => {
      const token = generateSignedDownloadToken({
        storageKey: testKey,
        fileName: 'test_scan.pdf',
      });

      const [payload, sig] = token.split('.');
      const tamperedSig = sig.slice(0, -4) + 'abcd';
      const tamperedToken = `${payload}.${tamperedSig}`;

      const result = verifySignedDownloadToken(tamperedToken);
      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid token signature. Access denied');
    });

    it('rejects expired token', () => {
      const token = generateSignedDownloadToken({
        storageKey: testKey,
        fileName: 'test_scan.pdf',
        ttlSeconds: -10, // already expired
      });

      const result = verifySignedDownloadToken(token);
      assert.equal(result.valid, false);
      assert.match(result.error, /expired/);
    });

    it('rejects tokens where payload key was manipulated to traverse directories', () => {
      // Craft a token manually with a traversal key and signed with current secret
      const maliciousPayload = {
        key: '../../package.json',
        name: 'package.json',
        disp: 'attachment',
        exp: Date.now() + 60000,
      };
      const encodedPayload = Buffer.from(JSON.stringify(maliciousPayload), 'utf8').toString('base64url');
      const signature = crypto
        .createHmac('sha256', process.env.STORAGE_SIGNING_SECRET)
        .update(encodedPayload)
        .digest('hex');
      const forgedToken = `${encodedPayload}.${signature}`;

      const result = verifySignedDownloadToken(forgedToken);
      assert.equal(result.valid, false);
      assert.match(result.error, /Path traversal sequence|escapes permitted root/);
    });
  });

  describe('4. File Operations (putObject, getObject, deleteObject)', () => {
    it('writes, reads, and deletes legitimate vault objects', async () => {
      const putRes = await putObject(testKey, testContent, 'application/pdf');
      assert.ok(putRes);
      assert.equal(putRes.key, testKey);

      const retrieved = await getObject(testKey);
      assert.ok(Buffer.isBuffer(retrieved));
      assert.equal(retrieved.toString(), testContent.toString());

      const delRes = await deleteObject(testKey);
      assert.equal(delRes, true);

      // Verify object is gone
      await assert.rejects(
        async () => getObject(testKey),
        { code: 'ENOENT' }
      );
    });

    it('putObject rejects directory traversal in key', async () => {
      await assert.rejects(
        async () => putObject('../malicious.js', testContent, 'application/javascript'),
        { code: 'EPATHTRAVERSAL', statusCode: 403 }
      );
    });

    it('getObject rejects directory traversal in key', async () => {
      await assert.rejects(
        async () => getObject('../../../package.json'),
        { code: 'EPATHTRAVERSAL', statusCode: 403 }
      );
    });

    it('deleteObject rejects directory traversal in key', async () => {
      await assert.rejects(
        async () => deleteObject('vault/../../package.json'),
        { code: 'EPATHTRAVERSAL', statusCode: 403 }
      );
    });
  });

  describe('5. Vault Controller Integration (serveStorageFile)', () => {
    it('serves file with safe headers when provided with a valid signed token', async () => {
      await putObject(testKey, testContent, 'application/pdf');

      const token = generateSignedDownloadToken({
        storageKey: testKey,
        fileName: 'test_scan.pdf',
        disposition: 'inline',
      });

      const req = { query: { token } };
      const res = {};

      await invokeHandler(serveStorageFile, req, res);

      assert.equal(res.headers['Content-Type'], 'application/octet-stream');
      assert.equal(res.headers['Content-Disposition'], 'inline; filename="test_scan.pdf"');
      assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
      assert.equal(res.headers['Cache-Control'], 'private, no-cache, no-store, must-revalidate');
      assert.equal(res.sentData.toString(), testContent.toString());
    });

    it('returns 400 when token query parameter is missing', async () => {
      const req = { query: {} };
      const res = {};

      await invokeHandler(serveStorageFile, req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Storage access token is required/);
    });

    it('returns 403 when token contains invalid or forged signature', async () => {
      const req = { query: { token: 'invalid.payload.token' } };
      const res = {};

      await invokeHandler(serveStorageFile, req, res);

      assert.equal(res.statusCode, 403);
    });

    it('returns 403 when token is crafted to attempt path traversal', async () => {
      const maliciousPayload = {
        key: '../../package.json',
        name: 'package.json',
        disp: 'attachment',
        exp: Date.now() + 60000,
      };
      const encodedPayload = Buffer.from(JSON.stringify(maliciousPayload), 'utf8').toString('base64url');
      const signature = crypto
        .createHmac('sha256', process.env.STORAGE_SIGNING_SECRET)
        .update(encodedPayload)
        .digest('hex');

      const req = { query: { token: `${encodedPayload}.${signature}` } };
      const res = {};

      await invokeHandler(serveStorageFile, req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /Path traversal sequence|Storage path traversal detected/);
    });
  });

  describe('6. Cloudflare R2 Compatibility Preservation', () => {
    it('maintains canonical buildStorageKey format', () => {
      const key = buildStorageKey({
        branch: 'Bengaluru',
        studentId: 'STD-101',
        category: 'academic_transcripts',
        fileName: 'marksheet.pdf',
      });
      assert.match(key, /^vault\/bengaluru\/STD-101\/academic_transcripts\/\d+_[0-9a-f]+_marksheet\.pdf$/);
    });

    it('preserves getR2ConfigSummary and isR2Configured interfaces', () => {
      const summary = getR2ConfigSummary();
      assert.equal(typeof summary, 'object');
      assert.equal(typeof isR2Configured(), 'boolean');
      assert.ok('provider' in summary);
      assert.ok('bucketName' in summary);
    });
  });
});
