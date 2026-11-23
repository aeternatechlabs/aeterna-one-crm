const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('../node_modules/mongoose');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm_test_forgot_password';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-aeterna-one-crm-forgot-password-key-2026';

const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const { ROLES, BRANCHES } = require('../src/config/constants');
const { mockReqRes } = require('./helpers/testApp');
const { forgotPassword, verifyResetOTP, resetPassword } = require('../src/modules/auth/auth.controller');

describe('Milestone 4: 3-Step Forgot Password & Email Dispatch Engine', () => {
  let isMongoConnected = false;
  let server;
  let baseUrl;
  let testUser;

  const TEST_EMAIL = 'counsellor.reset.test@aeterna.com';
  const OLD_PASSWORD = 'Password@123';
  const NEW_PASSWORD = 'SecureNewPassword@2026';

  const api = async (method, endpoint, { token, body, headers = {} } = {}) => {
    const res = await fetch(baseUrl + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, ok: res.ok, body: json };
  };

  before(async () => {
    try {
      await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
      isMongoConnected = true;
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }

      testUser = await User.create({
        name: 'Test Counsellor',
        email: TEST_EMAIL,
        password: OLD_PASSWORD,
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.BENGALURU,
        phone: '+91 98860 11223',
        isActive: true,
      });

      server = app.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
    } catch {
      isMongoConnected = false;
    }
  });

  after(async () => {
    if (server) {
      server.close();
    }
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // 0. IN-MEMORY CONTROLLER CHECKS
  // =========================================================================
  describe('0. Immediate Controller Logic & Validation (In-Memory)', () => {
    test('forgotPassword rejects empty email with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: {},
      });
      await forgotPassword(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /registered email address/i);
    });

    test('verifyResetOTP rejects missing OTP with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: { email: 'test@aeterna.com' },
      });
      await verifyResetOTP(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
    });

    test('resetPassword rejects missing password with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: { email: 'test@aeterna.com', resetToken: 'xyz' },
      });
      await resetPassword(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
    });

    test('resetPassword rejects password failing complexity policy', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: {
          email: 'test@aeterna.com',
          resetToken: 'xyz',
          newPassword: 'weak',
        },
      });
      await resetPassword(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /Password must be/i);
    });

    test('resetPassword rejects mismatched confirmPassword with HTTP 400', async () => {
      const { req, res, next, getNext } = mockReqRes({
        method: 'POST',
        body: {
          email: 'test@aeterna.com',
          resetToken: 'xyz',
          newPassword: 'Password@123',
          confirmPassword: 'DifferentPassword@123',
        },
      });
      await resetPassword(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 400);
      assert.match(nextError.message, /do not match/i);
    });
  });

  // =========================================================================
  // 1. END-TO-END 3-STEP RESET WIZARD API FLOW
  // =========================================================================
  describe('1. 3-Step Forgot Password & Email Dispatch Live Flow', () => {
    let dispatchedOtp;
    let issuedResetToken;

    test('Step 1: Request 6-digit OTP via POST /api/v1/auth/forgot-password', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/forgot-password', {
        body: { email: TEST_EMAIL },
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.message);
      assert.ok(res.body.devOtp, 'Should return devOtp in test environment');
      dispatchedOtp = res.body.devOtp;
      assert.equal(dispatchedOtp.length, 6, 'OTP must be 6 digits');

      // Verify DB stored hashed OTP and 15-minute expiration
      const userInDb = await User.findOne({ email: TEST_EMAIL }).select('+resetOTP +resetOTPExpires');
      assert.ok(userInDb.resetOTP, 'Must store bcrypt hashed OTP in database');
      assert.ok(userInDb.resetOTPExpires > new Date(), 'Must set future expiration date');
    });

    test('Step 2: Reject invalid OTP via POST /api/v1/auth/verify-reset-otp', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/verify-reset-otp', {
        body: {
          email: TEST_EMAIL,
          otp: '000000', // Invalid OTP
        },
      });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /Invalid verification code/i);
    });

    test('Step 2: Verify valid 6-digit OTP and issue single-use resetToken', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/verify-reset-otp', {
        body: {
          email: TEST_EMAIL,
          otp: dispatchedOtp,
        },
      });

      assert.equal(res.status, 200);
      issuedResetToken = res.body.resetToken;
      assert.ok(issuedResetToken, 'Must issue 32-byte cryptographic resetToken');

      // Check DB cleared resetOTP and stored SHA-256 hashed resetToken
      const userInDb = await User.findOne({ email: TEST_EMAIL }).select('+resetOTP +resetToken');
      assert.equal(userInDb.resetOTP, undefined, 'Must consume and clear OTP after verification');
      assert.ok(userInDb.resetToken, 'Must store hashed resetToken');
    });

    test('Step 3: Reset password with valid resetToken and complexity enforcement', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/reset-password', {
        body: {
          email: TEST_EMAIL,
          resetToken: issuedResetToken,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
        },
      });

      assert.equal(res.status, 200);
      assert.match(res.body.message, /Password reset successful/i);

      // Verify tokenVersion was incremented
      const updatedUser = await User.findOne({ email: TEST_EMAIL }).select('+resetToken');
      assert.equal(updatedUser.resetToken, undefined, 'resetToken must be consumed and cleared');
      assert.ok(updatedUser.tokenVersion >= 1, 'tokenVersion must be incremented to invalidate old sessions');
    });

    test('Replay Protection: Re-using the same resetToken is rejected with HTTP 400', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const res = await api('POST', '/auth/reset-password', {
        body: {
          email: TEST_EMAIL,
          resetToken: issuedResetToken,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
        },
      });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /Invalid or expired password reset authorization/i);
    });

    test('Authentication Verification: Old password is rejected, new password succeeds', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      // 1. Old password fails
      const failRes = await api('POST', '/auth/login', {
        body: {
          email: TEST_EMAIL,
          password: OLD_PASSWORD,
        },
      });
      assert.equal(failRes.status, 401);

      // 2. New password succeeds
      const successRes = await api('POST', '/auth/login', {
        body: {
          email: TEST_EMAIL,
          password: NEW_PASSWORD,
        },
      });
      assert.equal(successRes.status, 200);
      assert.ok(successRes.body.token || successRes.body.data?.token);
    });
  });
});
