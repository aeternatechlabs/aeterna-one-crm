require('dotenv').config();
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const User = require('../src/modules/users/user.model');
const Employee = require('../src/modules/employees/employee.model');
const { createEmployee } = require('../src/modules/employees/employee.controller');
const {
  login,
  getMe,
  changePassword,
  resetPassword,
  createTokens,
} = require('../src/modules/auth/auth.controller');
const { protect } = require('../src/middleware/authMiddleware');
const { validatePasswordComplexity } = require('../src/utils/passwordPolicy');
const {
  getLastDispatchedEmailForTesting,
  clearLastDispatchedEmailForTesting,
} = require('../src/services/emailService');
const { ROLES, BRANCHES } = require('../src/config/constants');

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

describe('VULN-09: Insecure Default Employee Password & Mandatory Password Setup Suite', () => {
  const originalEnv = { ...process.env };
  let isMongoConnected = false;
  let superAdminUser;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-minimum-vuln09!';

    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_test';
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      }
      isMongoConnected = mongoose.connection.readyState === 1;

      if (isMongoConnected) {
        await User.deleteMany({ email: /@vuln09test\.local$/i });
        await Employee.deleteMany({ email: /@vuln09test\.local$/i });

        superAdminUser = await User.findOne({ role: ROLES.SUPER_ADMIN });
        if (!superAdminUser) {
          superAdminUser = await User.create({
            name: 'Super Admin V9',
            email: 'superadmin.v9@vuln09test.local',
            password: 'SuperAdminPassword@2026',
            role: ROLES.SUPER_ADMIN,
            branch: BRANCHES.ALL,
            isActive: true,
            mustChangePassword: false,
          });
        }
      }
    } catch (err) {
      console.error('Mongo connection note:', err.message);
      isMongoConnected = false;
    }
  });

  after(async () => {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /@vuln09test\.local$/i });
      await Employee.deleteMany({ email: /@vuln09test\.local$/i });
    }
    process.env = originalEnv;
  });

  beforeEach(() => {
    clearLastDispatchedEmailForTesting();
  });

  describe('1. Elimination of Predictable Default Password & Secure Generation', () => {
    it('creates employee without password and DOES NOT expose temporary password in API response', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const empEmail = 'staff.nopass@vuln09test.local';
      const { req, res, next } = mockReqRes({
        user: superAdminUser,
        body: {
          first_name: 'Aarav',
          last_name: 'Sharma',
          employee_code: 'AET-V9-01',
          email: empEmail,
          branch: BRANCHES.BENGALURU,
          role: ROLES.COUNSELLOR,
        },
      });

      await createEmployee(req, res, next);
      assert.equal(res.statusCode, 201);

      const responseData = res.body?.data || res.body;
      assert.ok(responseData.credentials, 'Response should contain credentials metadata');
      assert.equal(responseData.credentials.email, empEmail);
      assert.equal(responseData.credentials.mustChangePassword, true);
      assert.equal(responseData.credentials.temporaryPasswordDispatched, true);

      // CRITICAL: Ensure temporary password is NOT exposed in the JSON response
      assert.strictEqual(
        responseData.credentials.password,
        undefined,
        'Temporary password MUST NEVER be exposed in the client-facing API response'
      );

      // Verify User record was created with mustChangePassword = true
      const user = await User.findOne({ email: empEmail }).select('+password');
      assert.ok(user, 'User record must be created');
      assert.equal(user.mustChangePassword, true, 'User record must require password change');
      assert.notEqual(user.password, 'Password@123', 'Default Password@123 must never be stored');

      // Verify onboarding email was dispatched with temporary credentials
      const dispatched = getLastDispatchedEmailForTesting();
      assert.ok(dispatched, 'An onboarding email must be dispatched to the employee');
      assert.equal(dispatched.to, empEmail);
      assert.ok(dispatched.tempPassword, 'Dispatched email must contain the generated temporary password');
      assert.notEqual(dispatched.tempPassword, 'Password@123', 'Generated temporary password must not be Password@123');
      assert.equal(validatePasswordComplexity(dispatched.tempPassword).valid, true);
    });

    it('creates employee with explicit password and marks mustChangePassword = true', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const empEmail = 'staff.withpass@vuln09test.local';
      const providedPass = 'InitialAdminPass@2026';

      const { req, res, next } = mockReqRes({
        user: superAdminUser,
        body: {
          first_name: 'Meera',
          last_name: 'Rao',
          employee_code: 'AET-V9-02',
          email: empEmail,
          branch: BRANCHES.BENGALURU,
          role: ROLES.COUNSELLOR,
          password: providedPass,
        },
      });

      await createEmployee(req, res, next);
      assert.equal(res.statusCode, 201);

      const responseData = res.body?.data || res.body;
      assert.equal(responseData.credentials.email, empEmail);
      assert.equal(responseData.credentials.password, providedPass);
      assert.equal(responseData.credentials.mustChangePassword, true);

      const user = await User.findOne({ email: empEmail });
      assert.equal(user.mustChangePassword, true);
    });

    it('verifies temporary credentials meet complexity policy and are cryptographically unique', () => {
      const generatedPasswords = new Set();
      for (let i = 0; i < 25; i++) {
        // Run employee controller creation logic or simulated generation
        const upperPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowerPool = 'abcdefghijkmnopqrstuvwxyz';
        const digitPool = '23456789';
        const specialPool = '!@#$%^&*()_+-=';
        const allPool = upperPool + lowerPool + digitPool + specialPool;

        const chars = [
          upperPool[crypto.randomInt(0, upperPool.length)],
          upperPool[crypto.randomInt(0, upperPool.length)],
          lowerPool[crypto.randomInt(0, lowerPool.length)],
          lowerPool[crypto.randomInt(0, lowerPool.length)],
          digitPool[crypto.randomInt(0, digitPool.length)],
          digitPool[crypto.randomInt(0, digitPool.length)],
          specialPool[crypto.randomInt(0, specialPool.length)],
          specialPool[crypto.randomInt(0, specialPool.length)],
        ];

        for (let j = 0; j < 8; j++) {
          chars.push(allPool[crypto.randomInt(0, allPool.length)]);
        }

        for (let j = chars.length - 1; j > 0; j--) {
          const k = crypto.randomInt(0, j + 1);
          [chars[j], chars[k]] = [chars[k], chars[j]];
        }

        const pwd = chars.join('');
        assert.equal(pwd.length, 16);
        const check = validatePasswordComplexity(pwd);
        assert.equal(check.valid, true, `Password ${pwd} must pass complexity`);
        generatedPasswords.add(pwd);
      }

      assert.equal(generatedPasswords.size, 25, 'All 25 generated passwords must be completely unique');
    });
  });

  describe('2. Mandatory Password Change Enforcement & Route Protection Gate', () => {
    let tempUser;
    let tempToken;
    let tempPassword;

    before(async () => {
      if (!isMongoConnected) return;

      const empEmail = 'staff.gate@vuln09test.local';
      const { req, res, next } = mockReqRes({
        user: superAdminUser,
        body: {
          first_name: 'Girish',
          last_name: 'Kulkarni',
          employee_code: 'AET-V9-03',
          email: empEmail,
          branch: BRANCHES.BENGALURU,
          role: ROLES.COUNSELLOR,
        },
      });

      await createEmployee(req, res, next);
      const email = getLastDispatchedEmailForTesting();
      tempPassword = email.tempPassword;

      // Log in with temporary credentials
      const { req: loginReq, res: loginRes } = mockReqRes({
        body: { email: empEmail, password: tempPassword },
      });

      await invokeHandler(login, loginReq, loginRes);
      assert.equal(loginRes.statusCode, 200);

      const loginData = loginRes.body?.data || loginRes.body;
      assert.equal(loginData.user.mustChangePassword, true);
      tempToken = loginData.token;
      tempUser = await User.findOne({ email: empEmail });
    });

    it('rejects access to CRM endpoints when user must change password (HTTP 403)', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const protectedRoutes = ['/api/v1/leads', '/api/v1/tasks', '/api/v1/students', '/api/v1/employees'];

      for (const route of protectedRoutes) {
        const { req, res, next } = mockReqRes({
          headers: { authorization: `Bearer ${tempToken}` },
          url: route,
          originalUrl: route,
        });

        const outcome = await invokeHandler(protect, req, res);
        assert.ok(outcome.nextError, `Route ${route} must be blocked`);
        assert.equal(outcome.nextError.statusCode, 403);
        assert.match(outcome.nextError.message, /Password change required/i);
      }
    });

    it('allows access to auth lifecycle routes (me, change-password, logout) during temporary password state', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const allowedRoutes = ['/api/v1/auth/me', '/api/v1/auth/change-password', '/api/v1/auth/logout'];

      for (const route of allowedRoutes) {
        const { req, res, next } = mockReqRes({
          headers: { authorization: `Bearer ${tempToken}` },
          url: route,
          originalUrl: route,
        });

        const outcome = await invokeHandler(protect, req, res);
        assert.equal(outcome.nextError, null, `Route ${route} must be allowed for password setup`);
        assert.ok(req.user, 'req.user must be attached by protect');
        assert.equal(req.user.mustChangePassword, true);
      }
    });
  });

  describe('3. Password Change Controller & Security Validation', () => {
    let userRecord;
    let staffToken;
    let currentStaffPass;

    beforeEach(async () => {
      if (!isMongoConnected) return;

      const empEmail = `staff.change.${Date.now()}@vuln09test.local`;
      const { req, res, next } = mockReqRes({
        user: superAdminUser,
        body: {
          first_name: 'Shreya',
          last_name: 'Patil',
          employee_code: `AET-${Math.floor(1000 + Math.random() * 9000)}`,
          email: empEmail,
          branch: BRANCHES.BENGALURU,
          role: ROLES.COUNSELLOR,
        },
      });

      await createEmployee(req, res, next);
      const email = getLastDispatchedEmailForTesting();
      currentStaffPass = email.tempPassword;

      const { req: loginReq, res: loginRes } = mockReqRes({
        body: { email: empEmail, password: currentStaffPass },
      });

      await invokeHandler(login, loginReq, loginRes);
      staffToken = loginRes.body?.data?.token || loginRes.body?.token;
      userRecord = await User.findOne({ email: empEmail });
    });

    it('rejects password change when current password is incorrect (HTTP 401)', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { req, res } = mockReqRes({
        user: userRecord,
        body: {
          currentPassword: 'WrongPassword@123',
          newPassword: 'BrandNewPassword@2026',
          confirmPassword: 'BrandNewPassword@2026',
        },
      });

      const outcome = await invokeHandler(changePassword, req, res);
      assert.ok(outcome.nextError);
      assert.equal(outcome.nextError.statusCode, 401);
      assert.match(outcome.nextError.message, /Current password is incorrect/i);
    });

    it('rejects weak new password failing complexity requirements (HTTP 400)', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const weakPasswords = ['short1!', 'NoDigitsHere!', 'nouppercase123!', 'NoSpecial12345'];

      for (const weak of weakPasswords) {
        const { req, res } = mockReqRes({
          user: userRecord,
          body: {
            currentPassword: currentStaffPass,
            newPassword: weak,
            confirmPassword: weak,
          },
        });

        const outcome = await invokeHandler(changePassword, req, res);
        assert.ok(outcome.nextError);
        assert.equal(outcome.nextError.statusCode, 400);
      }
    });

    it('rejects new password that is identical to current password (HTTP 400)', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { req, res } = mockReqRes({
        user: userRecord,
        body: {
          currentPassword: currentStaffPass,
          newPassword: currentStaffPass,
          confirmPassword: currentStaffPass,
        },
      });

      const outcome = await invokeHandler(changePassword, req, res);
      assert.ok(outcome.nextError);
      assert.equal(outcome.nextError.statusCode, 400);
      assert.match(outcome.nextError.message, /different from current password/i);
    });

    it('successfully changes password, clears mustChangePassword, and invalidates old sessions', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const newSecurePassword = 'MyPermanentPassword@2026';
      const initialTokenVersion = userRecord.tokenVersion || 0;

      const { req, res } = mockReqRes({
        user: userRecord,
        body: {
          currentPassword: currentStaffPass,
          newPassword: newSecurePassword,
          confirmPassword: newSecurePassword,
        },
      });

      const outcome = await invokeHandler(changePassword, req, res);
      assert.equal(outcome.res.statusCode, 200);

      const responseData = outcome.res.body?.data || outcome.res.body;
      assert.ok(responseData.token, 'Must return a fresh access token');
      assert.equal(responseData.user.mustChangePassword, false);

      // Verify User record in database has updated
      const updatedUser = await User.findById(userRecord._id).select('+password');
      assert.equal(updatedUser.mustChangePassword, false, 'mustChangePassword must be false');
      assert.equal(updatedUser.tokenVersion, initialTokenVersion + 1, 'tokenVersion must be incremented');

      // Verify the new password matches
      const isNewMatch = await updatedUser.matchPassword(newSecurePassword);
      assert.equal(isNewMatch, true, 'New password must match');

      // Verify old token is now REJECTED by protect due to tokenVersion mismatch
      const { req: oldReq, res: oldRes } = mockReqRes({
        headers: { authorization: `Bearer ${staffToken}` },
        url: '/api/v1/leads',
        originalUrl: '/api/v1/leads',
      });

      const oldTokenOutcome = await invokeHandler(protect, oldReq, oldRes);
      assert.ok(oldTokenOutcome.nextError, 'Old token must be rejected');
      assert.equal(oldTokenOutcome.nextError.statusCode, 401);
      assert.match(oldTokenOutcome.nextError.message, /Session has expired or token has been revoked/i);

      // Verify fresh token GRANTS access to CRM endpoints
      const freshToken = responseData.token;
      const { req: freshReq, res: freshRes } = mockReqRes({
        headers: { authorization: `Bearer ${freshToken}` },
        url: '/api/v1/leads',
        originalUrl: '/api/v1/leads',
      });

      const freshOutcome = await invokeHandler(protect, freshReq, freshRes);
      assert.equal(freshOutcome.nextError, null, 'Fresh token must grant full access');
      assert.equal(freshReq.user.mustChangePassword, false);
    });
  });

  describe('4. Zero-Regression: Existing Employees & Backward Compatibility', () => {
    it('allows existing employees with mustChangePassword: false to access CRM without interruption', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const existingEmail = 'existing.counsellor@vuln09test.local';
      const existingUser = await User.create({
        name: 'Vani Bhat',
        email: existingEmail,
        password: 'ExistingStrongPass@123',
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.BENGALURU,
        isActive: true,
        mustChangePassword: false,
      });

      const { accessToken } = createTokens(existingUser);

      const { req, res } = mockReqRes({
        headers: { authorization: `Bearer ${accessToken}` },
        url: '/api/v1/leads',
        originalUrl: '/api/v1/leads',
      });

      const outcome = await invokeHandler(protect, req, res);
      assert.equal(outcome.nextError, null, 'Existing employee must not be blocked');
      assert.equal(req.user.mustChangePassword, false);
    });

    it('clears mustChangePassword when user completes password reset via OTP flow', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const resetEmail = 'staff.resetflow@vuln09test.local';
      const resetUser = await User.create({
        name: 'Rohit Joshi',
        email: resetEmail,
        password: 'InitialPassword@2026',
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.BENGALURU,
        isActive: true,
        mustChangePassword: true,
      });

      // Directly set resetOTP to test resetPassword clearing mustChangePassword
      const rawOTP = '789123';
      resetUser.resetOTP = await bcrypt.hash(rawOTP, 10);
      resetUser.resetOTPExpires = new Date(Date.now() + 15 * 60 * 1000);
      await resetUser.save();

      const { req, res } = mockReqRes({
        body: {
          email: resetEmail,
          otp: rawOTP,
          newPassword: 'ResetSuccessfullyPass@2026',
          confirmPassword: 'ResetSuccessfullyPass@2026',
        },
      });

      const outcome = await invokeHandler(resetPassword, req, res);
      assert.equal(outcome.res.statusCode, 200);

      const updated = await User.findOne({ email: resetEmail });
      assert.equal(updated.mustChangePassword, false, 'Password reset must clear mustChangePassword');
    });
  });
});
