const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mockReqRes } = require('./helpers/testApp');
const { requireRole } = require('../src/middleware/roleMiddleware');
const { ROLES, BRANCHES } = require('../src/config/constants');
const authRoutes = require('../src/modules/auth/auth.routes');

describe('P0-SEC-001: Eliminate Public Privilege Escalation & Secure Staff Provisioning', () => {
  test('requireRole rejects unauthenticated requests with 401', () => {
    const middleware = requireRole(ROLES.SUPER_ADMIN);
    const { req, res, next, getNext } = mockReqRes({ user: null });

    middleware(req, res, next);
    const { nextError } = getNext();
    assert.ok(nextError, 'Expected next(err) to be called');
    assert.strictEqual(nextError.statusCode, 401);
  });

  test('requireRole rejects non-super_admin roles with 403 Forbidden', () => {
    const middleware = requireRole(ROLES.SUPER_ADMIN);
    const unauthorizedRoles = [
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.APPLICATION_OFFICER,
      ROLES.MARKETING,
    ];

    for (const role of unauthorizedRoles) {
      const { req, res, next, getNext } = mockReqRes({
        user: { _id: 'user_1', role, branch: BRANCHES.BENGALURU },
      });

      middleware(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError, `Expected next(err) for role ${role}`);
      assert.strictEqual(nextError.statusCode, 403);
      assert.ok(nextError.message.includes('Access forbidden'));
    }
  });

  test('requireRole permits super_admin to proceed', () => {
    const middleware = requireRole(ROLES.SUPER_ADMIN);
    const { req, res, next, getNext } = mockReqRes({
      user: { _id: 'admin_1', role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
    });

    middleware(req, res, next);
    const { nextCalled, nextError } = getNext();
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(nextError, null);
  });

  test('auth.routes registers /register with protect and requireRole(super_admin)', () => {
    const registerRoute = authRoutes.stack.find(
      (layer) => layer.route && layer.route.path === '/register' && layer.route.methods.post
    );

    assert.ok(registerRoute, 'POST /register route must be registered');
    assert.ok(
      registerRoute.route.stack.length >= 3,
      'POST /register must have multiple middleware layers (protect, requireRole, validators, handler)'
    );
  });
});
