require('dotenv').config();
const { test, describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { mockReqRes } = require('./helpers/testApp');
const User = require('../src/modules/users/user.model');
const {
  login,
  refresh,
  logout,
  changePassword,
  createTokens,
  clearRotatedTokensForTesting,
} = require('../src/modules/auth/auth.controller');
const { protect } = require('../src/middleware/authMiddleware');
const { JWT, ROLES, BRANCHES } = require('../src/config/constants');

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

describe('VULN-10: JWT Session Lifetime, Rotation & Absolute Expiration Suite', () => {
  const originalEnv = { ...process.env };
  const JWT_SECRET = 'test-jwt-secret-key-32chars-minimum-vuln10!';
  let isMongoConnected = false;
  let testUser;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_test';
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      }
      isMongoConnected = mongoose.connection.readyState === 1;

      if (isMongoConnected) {
        await User.deleteMany({ email: /@vuln10test\.local$/i });
        testUser = await User.create({
          name: 'Session Test User',
          email: 'session.user@vuln10test.local',
          password: 'SessionPassword@2026',
          role: ROLES.COUNSELLOR,
          branch: BRANCHES.BENGALURU,
          isActive: true,
          mustChangePassword: false,
        });
      }
    } catch (_) {
      isMongoConnected = false;
    }
  });

  after(async () => {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: /@vuln10test\.local$/i });
    }
    process.env = originalEnv;
  });

  beforeEach(async () => {
    clearRotatedTokensForTesting();
    delete process.env.REFRESH_GRACE_PERIOD_MS;
    if (isMongoConnected && testUser) {
      testUser = await User.findById(testUser._id);
    }
  });

  describe('1. Access Token Lifetime & Token Type Separation', () => {
    it('issues 15-minute access token and 7-day refresh token on login', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { req, res } = mockReqRes({
        body: { email: 'session.user@vuln10test.local', password: 'SessionPassword@2026' },
      });

      await invokeHandler(login, req, res);
      assert.equal(res.statusCode, 200);

      const data = res.body?.data || res.body;
      assert.ok(data.token, 'Must return access token');
      assert.ok(data.refreshToken, 'Must return refresh token');

      // Decode and verify access token expiration
      const decodedAccess = jwt.verify(data.token, JWT_SECRET);
      const accessLifetimeSeconds = decodedAccess.exp - decodedAccess.iat;
      assert.equal(accessLifetimeSeconds, 15 * 60, 'Access token must have 15-minute (900s) lifetime');
      assert.equal(decodedAccess.type, 'access', 'Access token must be tagged type=access');

      // Decode and verify refresh token payload
      const decodedRefresh = jwt.verify(data.refreshToken, JWT_SECRET);
      const refreshLifetimeSeconds = decodedRefresh.exp - decodedRefresh.iat;
      assert.equal(refreshLifetimeSeconds, 7 * 24 * 60 * 60, 'Refresh token must have 7-day lifetime');
      assert.equal(decodedRefresh.type, 'refresh', 'Refresh token must be tagged type=refresh');
      assert.ok(decodedRefresh.tokenId, 'Refresh token must carry a unique tokenId');
      assert.ok(decodedRefresh.sessionCreatedAt, 'Refresh token must carry sessionCreatedAt');
    });

    it('rejects refresh token when mistakenly used as access token on protected routes', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { refreshToken } = createTokens(testUser);

      const { req, res } = mockReqRes({
        headers: { authorization: `Bearer ${refreshToken}` },
        url: '/api/v1/auth/me',
        originalUrl: '/api/v1/auth/me',
      });

      const outcome = await invokeHandler(protect, req, res);
      assert.ok(outcome.nextError);
      assert.equal(outcome.nextError.statusCode, 401);
      assert.match(outcome.nextError.message, /expected an access token/i);
    });

    it('rejects access token when mistakenly used as refresh token on /auth/refresh', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const { accessToken } = createTokens(testUser);

      const { req, res } = mockReqRes({
        body: { refreshToken: accessToken },
      });

      const outcome = await invokeHandler(refresh, req, res);
      assert.ok(outcome.nextError);
      assert.equal(outcome.nextError.statusCode, 401);
      assert.match(outcome.nextError.message, /expected a refresh token/i);
    });
  });

  describe('2. Refresh Token Rotation & Session Continuity', () => {
    it('rotates refresh token and preserves original sessionCreatedAt timestamp', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const fixedSessionEpoch = Math.floor(Date.now() / 1000) - 3600; // Session began 1 hour ago
      const { refreshToken: r1, tokenId: t1Id } = createTokens(testUser, fixedSessionEpoch);

      const { req, res } = mockReqRes({
        body: { refreshToken: r1 },
      });

      await invokeHandler(refresh, req, res);
      assert.equal(res.statusCode, 200);

      const data = res.body?.data || res.body;
      const r2 = data.refreshToken;
      assert.ok(r2, 'Response must return rotated refresh token');
      assert.notEqual(r2, r1, 'Rotated token must be different from initial token');

      const decodedR2 = jwt.verify(r2, JWT_SECRET);
      assert.notEqual(decodedR2.tokenId, t1Id, 'New token must have a new unique tokenId');
      assert.equal(
        decodedR2.sessionCreatedAt,
        fixedSessionEpoch,
        'Rotated token must strictly preserve the original sessionCreatedAt'
      );
    });

    it('safely handles concurrent refresh requests within grace window without session corruption', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      // Default grace period is 30s
      process.env.REFRESH_GRACE_PERIOD_MS = '30000';

      const { refreshToken: r1 } = createTokens(testUser);

      // First refresh request
      const { req: req1, res: res1 } = mockReqRes({ body: { refreshToken: r1 } });
      await invokeHandler(refresh, req1, res1);
      assert.equal(res1.statusCode, 200);
      const firstRotatedToken = res1.body?.data?.refreshToken || res1.body?.refreshToken;

      // Concurrent second refresh request with same r1 within 30s
      const { req: req2, res: res2 } = mockReqRes({ body: { refreshToken: r1 } });
      await invokeHandler(refresh, req2, res2);
      assert.equal(res2.statusCode, 200, 'Concurrent request within grace window must succeed');
      const secondRotatedToken = res2.body?.data?.refreshToken || res2.body?.refreshToken;

      // Both concurrent requests safely share the rotated credentials
      assert.equal(secondRotatedToken, firstRotatedToken);
    });

    it('detects refresh token reuse outside grace window, revokes user sessions, and returns 401', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      // Set grace window to 0 to simulate replay after window expiry
      process.env.REFRESH_GRACE_PERIOD_MS = '0';

      const initialTokenVersion = testUser.tokenVersion || 0;
      const { refreshToken: r1 } = createTokens(testUser);

      // Legitimate client rotates r1 -> receives r2
      const { req: legitReq, res: legitRes } = mockReqRes({ body: { refreshToken: r1 } });
      await invokeHandler(refresh, legitReq, legitRes);
      assert.equal(legitRes.statusCode, 200);

      // Attacker attempts to replay already-rotated r1
      const { req: attackReq, res: attackRes } = mockReqRes({ body: { refreshToken: r1 } });
      const attackOutcome = await invokeHandler(refresh, attackReq, attackRes);

      assert.ok(attackOutcome.nextError, 'Replay of rotated token must fail');
      assert.equal(attackOutcome.nextError.statusCode, 401);
      assert.match(attackOutcome.nextError.message, /token reuse detected/i);

      // Verify all sessions were invalidated by incrementing tokenVersion
      const userAfterBreach = await User.findById(testUser._id);
      assert.equal(
        userAfterBreach.tokenVersion,
        initialTokenVersion + 1,
        'tokenVersion must be incremented on token reuse to neutralize stolen credentials'
      );
    });
  });

  describe('3. Absolute 30-Day Session Expiration', () => {
    it('rejects refresh when session age exceeds 30 days regardless of valid token signature', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const thirtyOneDaysAgo = Math.floor(Date.now() / 1000) - (31 * 24 * 60 * 60);
      const { refreshToken } = createTokens(testUser, thirtyOneDaysAgo);

      const { req, res } = mockReqRes({ body: { refreshToken } });
      const outcome = await invokeHandler(refresh, req, res);

      assert.ok(outcome.nextError, 'Must reject refresh when session age exceeds 30 days');
      assert.equal(outcome.nextError.statusCode, 401);
      assert.match(outcome.nextError.message, /Absolute session lifetime \(30 days\) has expired/i);
    });

    it('rejects standard expired refresh tokens (7 days expiration)', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      // Sign token with exp in the past
      const expiredRefreshToken = jwt.sign(
        { id: testUser._id, tokenVersion: testUser.tokenVersion || 0, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const { req, res } = mockReqRes({ body: { refreshToken: expiredRefreshToken } });
      const outcome = await invokeHandler(refresh, req, res);

      assert.ok(outcome.nextError);
      assert.equal(outcome.nextError.statusCode, 401);
      assert.match(outcome.nextError.message, /Invalid or expired refresh token/i);
    });
  });

  describe('4. Session Revocation: Logout & Password Changes', () => {
    it('invalidates refresh token immediately after user logout', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const freshUser = await User.create({
        name: 'Logout Test User',
        email: 'logout.user@vuln10test.local',
        password: 'LogoutPassword@2026',
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.BENGALURU,
        isActive: true,
      });

      const { refreshToken } = createTokens(freshUser);

      // User logs out
      const { req: logoutReq, res: logoutRes } = mockReqRes({
        user: freshUser,
        body: { refreshToken },
      });
      await invokeHandler(logout, logoutReq, logoutRes);
      assert.equal(logoutRes.statusCode, 200);

      // Attempt to refresh with token issued before logout
      const { req: refreshReq, res: refreshRes } = mockReqRes({ body: { refreshToken } });
      const refreshOutcome = await invokeHandler(refresh, refreshReq, refreshRes);

      assert.ok(refreshOutcome.nextError, 'Old refresh token must be rejected after logout');
      assert.equal(refreshOutcome.nextError.statusCode, 401);
      assert.match(refreshOutcome.nextError.message, /revoked or expired/i);
    });

    it('invalidates refresh token immediately after password change', async (t) => {
      if (!isMongoConnected) return t.skip('MongoDB not reachable');

      const pwdUser = await User.create({
        name: 'Pwd User V10',
        email: 'pwd.v10@vuln10test.local',
        password: 'OldPassword@2026',
        role: ROLES.COUNSELLOR,
        branch: BRANCHES.BENGALURU,
        isActive: true,
      });

      const { refreshToken } = createTokens(pwdUser);

      // Change password
      const { req: changeReq, res: changeRes } = mockReqRes({
        user: pwdUser,
        body: {
          currentPassword: 'OldPassword@2026',
          newPassword: 'BrandNewPassword@2026',
          confirmPassword: 'BrandNewPassword@2026',
        },
      });
      await invokeHandler(changePassword, changeReq, changeRes);
      assert.equal(changeRes.statusCode, 200);

      // Attempt to refresh with old token
      const { req: refreshReq, res: refreshRes } = mockReqRes({ body: { refreshToken } });
      const refreshOutcome = await invokeHandler(refresh, refreshReq, refreshRes);

      assert.ok(refreshOutcome.nextError, 'Old refresh token must be rejected after password change');
      assert.equal(refreshOutcome.nextError.statusCode, 401);
      assert.match(refreshOutcome.nextError.message, /revoked or expired/i);
    });
  });
});
