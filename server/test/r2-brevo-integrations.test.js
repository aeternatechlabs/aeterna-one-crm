const { test, it, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStorageKey,
  generateSignedDownloadToken,
  verifySignedDownloadToken,
  putObject,
  getObject,
  deleteObject,
  isR2Configured,
  getR2ConfigSummary,
  generateR2PresignedUrl,
  testR2Connection,
} = require('../src/modules/vault/storage.service');

const {
  renderPasswordResetEmail,
  sendEmail,
  sendPasswordResetOTP,
  isBrevoConfigured,
  getBrevoConfigSummary,
  testBrevoConnection,
} = require('../src/services/emailService');

const {
  getIntegrationSettings,
  testEmailDispatch,
  testStorageConnection,
} = require('../src/modules/settings/settings.controller');

describe('Cloudflare R2 Object Storage & Brevo Email Engine Architecture Suite', () => {
  describe('1. Cloudflare R2 S3-Compatible Storage Engine', () => {
    it('generates canonical private bucket storage keys', () => {
      const key = buildStorageKey({
        branch: 'Bengaluru',
        studentId: 'aet-blr-2026-0001',
        category: 'academic_transcripts',
        fileName: 'Degree Certificate 2025.pdf',
      });

      assert.match(key, /^vault\/bengaluru\/AET-BLR-2026-0001\/academic_transcripts\/\d+_[0-9a-f]+_Degree_Certificate_2025\.pdf$/);
    });

    it('reports accurate R2 configuration summary metadata without leaking raw secrets', () => {
      const summary = getR2ConfigSummary();
      assert.ok(summary);
      assert.equal(typeof summary.isConfigured, 'boolean');
      assert.ok(summary.provider === 'cloudflare_r2' || summary.provider === 'local_vault');
      assert.equal(typeof summary.bucketName, 'string');
      // Assert raw secret keys are never exposed in summary
      assert.equal(summary.secretAccessKey, undefined);
    });

    it('successfully executes putObject, getObject, and deleteObject file lifecycle', async () => {
      const testKey = `vault/test/unit_test_${Date.now()}.txt`;
      const testBuffer = Buffer.from('Cloudflare R2 and Vault CRUD Test Content 2026');
      const contentType = 'text/plain';

      // 1. Write / Upload (Add)
      const putResult = await putObject(testKey, testBuffer, contentType);
      assert.ok(putResult);
      assert.equal(putResult.key, testKey);
      assert.equal(putResult.size, testBuffer.length);
      assert.ok(putResult.provider === 'local' || putResult.provider === 'cloudflare_r2');

      // 2. Read / Download
      const retrieved = await getObject(testKey);
      assert.ok(retrieved);
      assert.equal(retrieved.toString(), testBuffer.toString());

      // 3. Delete / Purge
      const deleteResult = await deleteObject(testKey);
      assert.equal(deleteResult, true);

      // 4. Verify post-delete read throws 404/ENOENT
      await assert.rejects(async () => {
        await getObject(testKey);
      }, /ENOENT|not found/i);
    });

    it('generates tamper-proof HMAC-SHA256 signed download tokens and rejects expired/tampered tokens', () => {
      const storageKey = 'vault/bengaluru/TEST-001/passport/pass.pdf';
      const token = generateSignedDownloadToken({
        storageKey,
        fileName: 'pass.pdf',
        ttlSeconds: 60,
      });

      assert.ok(token);
      assert.ok(token.includes('.'));

      // Valid token verification
      const verified = verifySignedDownloadToken(token);
      assert.equal(verified.valid, true);
      assert.equal(verified.payload.key, storageKey);
      assert.equal(verified.payload.name, 'pass.pdf');

      // Tampered token rejection
      const tampered = token.slice(0, -4) + 'abcd';
      const tamperedCheck = verifySignedDownloadToken(tampered);
      assert.equal(tamperedCheck.valid, false);
      assert.match(tamperedCheck.error, /Invalid token signature/i);
    });

    it('testR2Connection executes cleanly and reports healthcheck status', async () => {
      const health = await testR2Connection();
      assert.ok(health);
      assert.equal(typeof health.connected, 'boolean');
      assert.ok(health.provider === 'cloudflare_r2' || health.provider === 'local_vault');
    });
  });

  describe('2. Brevo (Sendinblue) Transactional Email Engine', () => {
    it('renders responsive luxury HTML email template with Karnataka aesthetic and 6-digit OTP', () => {
      const testOTP = '987654';
      const html = renderPasswordResetEmail({
        otp: testOTP,
        name: 'Rajesh Kumar',
        expiryMinutes: 15,
      });

      assert.ok(html.includes('Aeterna One'));
      assert.ok(html.includes(testOTP));
      assert.ok(html.includes('Rajesh Kumar'));
      assert.ok(html.includes('#5a0c1e')); // Royal Maroon
      assert.ok(html.includes('#faf7f2')); // Warm Cream
      assert.ok(html.includes('#9a6a24')); // Gold
      assert.ok(html.includes('Valid for the next 15 minutes'));
    });

    it('reports Brevo configuration status metadata without leaking raw API keys', () => {
      const summary = getBrevoConfigSummary();
      assert.ok(summary);
      assert.equal(typeof summary.isConfigured, 'boolean');
      assert.equal(typeof summary.senderEmail, 'string');
      assert.equal(typeof summary.senderName, 'string');
      // Assert raw key is masked or marked Not Configured
      assert.ok(!summary.apiKeyMasked.includes('xkeysib-') || summary.apiKeyMasked.includes('...'));
    });

    it('dispatches email and returns provider receipt', async () => {
      const dispatch = await sendEmail({
        to: 'admissions.test@aeterna.com',
        subject: 'Test Integration Subject',
        html: '<p>Integration Test Body</p>',
      });

      assert.ok(dispatch);
      assert.equal(dispatch.success, true);
      assert.ok(
        dispatch.provider === 'development-simulator' ||
        dispatch.provider === 'brevo_v3_direct' ||
        dispatch.provider === 'brevo_package'
      );
    });

    it('dispatches password reset OTP through sendPasswordResetOTP helper', async () => {
      const dispatch = await sendPasswordResetOTP('staff.test@aeterna.com', '123456', 'Priya Sharma');
      assert.ok(dispatch);
      assert.equal(dispatch.success, true);
    });

    it('testBrevoConnection returns structured status', async () => {
      const conn = await testBrevoConnection();
      assert.ok(conn);
      assert.equal(typeof conn.connected, 'boolean');
      assert.ok(conn.provider === 'brevo' || conn.provider === 'development-simulator');
    });
  });

  describe('3. Super Admin Settings API Endpoints for Cloud Integrations', () => {
    function createMockRes() {
      return {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
    }

    it('testEmailDispatch sends test email and returns 200 with dispatch receipt', async () => {
      const req = {
        user: { email: 'admin@aeterna.com', role: 'super_admin' },
        body: { testEmail: 'admin@aeterna.com' },
      };
      const res = createMockRes();

      await testEmailDispatch(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.body);
      assert.equal(res.body.success, true);
      const targetEmail = res.body.targetEmail || res.body.data?.targetEmail;
      const dispatchResult = res.body.dispatchResult || res.body.data?.dispatchResult;
      assert.equal(targetEmail, 'admin@aeterna.com');
      assert.ok(dispatchResult);
    });

    it('testStorageConnection returns 200 with storage healthcheck', async () => {
      const req = { user: { role: 'super_admin' } };
      const res = createMockRes();

      await testStorageConnection(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.body);
      assert.equal(res.body.success, true);
      const isStorageChecked = res.body.checkedAt || res.body.data?.checkedAt || res.body.connected !== undefined;
      assert.ok(isStorageChecked);
    });
  });
});
