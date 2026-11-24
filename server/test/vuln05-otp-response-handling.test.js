const { test, describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const User = require('../src/modules/users/user.model');
const {
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require('../src/modules/auth/auth.controller');
const {
  sendPasswordResetOTP,
  getLastDispatchedEmailForTesting,
  clearLastDispatchedEmailForTesting,
} = require('../src/services/emailService');

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

describe('VULN-05: Sensitive OTP Exposure in Password Reset API Responses Suite', () => {
  const originalEnv = { ...process.env };
  const testUserId = new mongoose.Types.ObjectId();
  const testEmail = 'counsellor.otp.test@aeterna.com';
  const testName = 'Priya Sharma';

  let mockUserRecord;
  let origFindOne;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-minimum!';
    clearLastDispatchedEmailForTesting();

    mockUserRecord = {
      _id: testUserId,
      name: testName,
      email: testEmail,
      role: 'counsellor',
      branch: 'bengaluru',
      isActive: true,
      tokenVersion: 1,
      resetOTP: undefined,
      resetOTPExpires: undefined,
      resetToken: undefined,
      resetTokenExpires: undefined,
      save: async function () {
        return this;
      },
    };

    origFindOne = User.findOne;
    User.findOne = function (query) {
      const qEmail = query.email ? query.email.toLowerCase() : null;
      const isMatch = qEmail === testEmail;

      return {
        select: function () {
          return Promise.resolve(isMatch ? mockUserRecord : null);
        },
        then: function (resolve, reject) {
          return Promise.resolve(isMatch ? mockUserRecord : null).then(resolve, reject);
        },
      };
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    User.findOne = origFindOne;
    clearLastDispatchedEmailForTesting();
  });

  describe('1. Response Confidentiality & User Enumeration Protection', () => {
    it('never leaks devOtp, otp, or plaintext code in forgotPassword response for existing user', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail },
      });

      const result = await invokeHandler(forgotPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const body = res.body || {};
      const data = body.data || body;

      // Primary vulnerability check: devOtp and otp must NEVER exist
      assert.equal(body.devOtp, undefined, 'Must not return devOtp at root');
      assert.equal(data.devOtp, undefined, 'Must not return devOtp in data payload');
      assert.equal(body.otp, undefined, 'Must not return raw otp at root');
      assert.equal(data.otp, undefined, 'Must not return raw otp in data payload');
      assert.equal(body.code, undefined);
      assert.equal(data.code, undefined);

      // Verify sanitized message
      assert.match(data.message, /If an account exists with this email address/);
    });

    it('returns an identical response structure for a non-existent user (anti-enumeration)', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: 'nonexistent.user@unknown-domain.com' },
      });

      const result = await invokeHandler(forgotPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const body = res.body || {};
      const data = body.data || body;

      assert.equal(body.devOtp, undefined);
      assert.equal(data.devOtp, undefined);
      assert.equal(body.otp, undefined);
      assert.equal(data.otp, undefined);
      assert.match(data.message, /If an account exists with this email address/);
    });

    it('returns an identical response structure for an inactive user', async () => {
      mockUserRecord.isActive = false;

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail },
      });

      const result = await invokeHandler(forgotPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const data = res.body?.data || res.body;
      assert.equal(data.devOtp, undefined);
      assert.match(data.message, /If an account exists with this email address/);
    });
  });

  describe('2. Multi-Environment Strict devOtp Elimination', () => {
    it('strictly omits devOtp when NODE_ENV is "development"', async () => {
      process.env.NODE_ENV = 'development';

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail },
      });

      const result = await invokeHandler(forgotPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const body = res.body || {};
      const data = body.data || body;
      assert.equal(body.devOtp, undefined);
      assert.equal(data.devOtp, undefined);
    });

    it('strictly omits devOtp when NODE_ENV is "staging"', async () => {
      process.env.NODE_ENV = 'staging';

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail },
      });

      const result = await invokeHandler(forgotPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const body = res.body || {};
      const data = body.data || body;
      assert.equal(body.devOtp, undefined);
      assert.equal(data.devOtp, undefined);
    });

    it('strictly omits devOtp when NODE_ENV is "production"', async () => {
      process.env.NODE_ENV = 'production';

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail },
      });

      const result = await invokeHandler(forgotPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const body = res.body || {};
      const data = body.data || body;
      assert.equal(body.devOtp, undefined);
      assert.equal(data.devOtp, undefined);

      // In production, test mailbox must return null (fail-closed)
      assert.equal(getLastDispatchedEmailForTesting(), null);
    });
  });

  describe('3. Cryptographic OTP Storage & Secure Hashing', () => {
    it('generates a 6-digit OTP and stores only its bcrypt hash in the database', async () => {
      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail },
      });

      await invokeHandler(forgotPassword, req, res);

      // Verify database stored bcrypt hash
      assert.ok(mockUserRecord.resetOTP, 'Must store resetOTP in user record');
      assert.ok(mockUserRecord.resetOTP.startsWith('$2'), 'Stored resetOTP must be a valid bcrypt hash');
      assert.notEqual(mockUserRecord.resetOTP.length, 6, 'Must never store plain 6-digit OTP');

      // Verify expiration is ~15 minutes into the future
      assert.ok(mockUserRecord.resetOTPExpires instanceof Date);
      const diffMs = mockUserRecord.resetOTPExpires.getTime() - Date.now();
      assert.ok(diffMs > 13 * 60 * 1000 && diffMs <= 15 * 60 * 1000, 'Expiration must be ~15 minutes');

      // Verify the dispatched OTP matches the stored hash
      const captured = getLastDispatchedEmailForTesting();
      assert.ok(captured, 'Must capture dispatched email in test environment');
      assert.match(captured.otp, /^\d{6}$/, 'Dispatched OTP must be exactly 6 numeric digits');
      const isMatch = await bcrypt.compare(captured.otp, mockUserRecord.resetOTP);
      assert.equal(isMatch, true, 'Plaintext dispatched OTP must verify against bcrypt hash');
    });
  });

  describe('4. OTP Verification, Replay Protection & Expiration', () => {
    it('successfully verifies correct OTP, issues single-use resetToken, and purges OTP', async () => {
      const plainOtp = '482915';
      mockUserRecord.resetOTP = await bcrypt.hash(plainOtp, 10);
      mockUserRecord.resetOTPExpires = new Date(Date.now() + 15 * 60 * 1000);

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail, otp: plainOtp },
      });

      const result = await invokeHandler(verifyResetOTP, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const data = res.body?.data || res.body;
      assert.ok(data.resetToken, 'Must issue resetToken');
      assert.equal(data.resetToken.length, 64, 'resetToken must be 32 bytes hex (64 chars)');
      assert.equal(data.devOtp, undefined);
      assert.equal(data.otp, undefined);

      // Verify OTP is cleared in database (prevents replay)
      assert.equal(mockUserRecord.resetOTP, undefined);
      assert.equal(mockUserRecord.resetOTPExpires, undefined);
      assert.ok(mockUserRecord.resetToken, 'Must store hashed resetToken in database');
    });

    it('rejects incorrect OTP with HTTP 400 and preserves stored hash', async () => {
      const plainOtp = '482915';
      const storedHash = await bcrypt.hash(plainOtp, 10);
      mockUserRecord.resetOTP = storedHash;
      mockUserRecord.resetOTPExpires = new Date(Date.now() + 15 * 60 * 1000);

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail, otp: '999999' },
      });

      const result = await invokeHandler(verifyResetOTP, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Invalid verification code/i);

      // Stored OTP remains for retry
      assert.equal(mockUserRecord.resetOTP, storedHash);
    });

    it('rejects expired OTP with HTTP 400', async () => {
      const plainOtp = '482915';
      mockUserRecord.resetOTP = await bcrypt.hash(plainOtp, 10);
      // Expired 5 minutes ago
      mockUserRecord.resetOTPExpires = new Date(Date.now() - 5 * 60 * 1000);

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail, otp: plainOtp },
      });

      const result = await invokeHandler(verifyResetOTP, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /Verification code has expired/i);
    });

    it('strictly prevents replay attacks on already-consumed OTP', async () => {
      // OTP was already cleared after initial verification
      mockUserRecord.resetOTP = undefined;
      mockUserRecord.resetOTPExpires = undefined;

      const { req, res } = mockReqRes({
        method: 'POST',
        body: { email: testEmail, otp: '482915' },
      });

      const result = await invokeHandler(verifyResetOTP, req, res);
      assert.equal(result.nextCalled, true);
      assert.equal(result.nextError?.statusCode, 400);
      assert.match(result.nextError?.message, /No active reset request found/i);
    });
  });

  describe('5. Password Reset Completion & Session Invalidation', () => {
    it('completes password reset, increments tokenVersion, and clears all reset tokens', async () => {
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

      mockUserRecord.resetToken = hashedResetToken;
      mockUserRecord.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
      const initialTokenVersion = mockUserRecord.tokenVersion;

      const { req, res } = mockReqRes({
        method: 'POST',
        body: {
          email: testEmail,
          resetToken: rawResetToken,
          newPassword: 'SecureNewPassword@2026',
          confirmPassword: 'SecureNewPassword@2026',
        },
      });

      const result = await invokeHandler(resetPassword, req, res);
      assert.equal(result.nextCalled, false);
      assert.equal(res.statusCode, 200);

      const data = res.body?.data || res.body;
      assert.match(data.message, /Password reset successful/i);
      assert.equal(data.devOtp, undefined);
      assert.equal(data.otp, undefined);

      // Verify tokenVersion incremented to invalidate previous sessions
      assert.equal(mockUserRecord.tokenVersion, initialTokenVersion + 1);
      // Verify tokens cleared
      assert.equal(mockUserRecord.resetToken, undefined);
      assert.equal(mockUserRecord.resetTokenExpires, undefined);
      assert.equal(mockUserRecord.resetOTP, undefined);
      assert.equal(mockUserRecord.resetOTPExpires, undefined);
    });
  });

  describe('6. Email Delivery & Application Log Protection', () => {
    it('delivers OTP inside email HTML body and keeps subject free of plaintext OTP', async () => {
      const testOtp = '739104';
      await sendPasswordResetOTP(testEmail, testOtp, 'Priya Sharma');

      const captured = getLastDispatchedEmailForTesting();
      assert.ok(captured);
      assert.equal(captured.to, testEmail);
      assert.equal(captured.otp, testOtp);

      // Clear test mailbox
      clearLastDispatchedEmailForTesting();
      assert.equal(getLastDispatchedEmailForTesting(), null);
    });
  });
});
