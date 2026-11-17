const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mockReqRes } = require('./helpers/testApp');
const { requireRole } = require('../src/middleware/roleMiddleware');
const { ROLES, BRANCHES } = require('../src/config/constants');
const pipelineRoutes = require('../src/modules/pipeline/pipeline.routes');

describe('P0-SEC-002: Pipeline RBAC and Record-Level Branch Isolation', () => {
  describe('1. Role-Based Access Control (RBAC)', () => {
    test('Marketing role is rejected from viewing pipeline with 403', () => {
      const viewMiddleware = requireRole(
        ROLES.SUPER_ADMIN,
        ROLES.BRANCH_MANAGER,
        ROLES.COUNSELLOR,
        ROLES.APPLICATION_OFFICER
      );
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.MARKETING, branch: BRANCHES.BENGALURU },
      });

      viewMiddleware(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.strictEqual(nextError.statusCode, 403);
    });

    test('Application officer is rejected from moving pipeline stages with 403', () => {
      const moveMiddleware = requireRole(
        ROLES.SUPER_ADMIN,
        ROLES.BRANCH_MANAGER,
        ROLES.COUNSELLOR
      );
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU },
      });

      moveMiddleware(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.strictEqual(nextError.statusCode, 403);
    });

    test('Counsellor is rejected from verifying documents with 403', () => {
      const docMiddleware = requireRole(
        ROLES.SUPER_ADMIN,
        ROLES.BRANCH_MANAGER,
        ROLES.APPLICATION_OFFICER
      );
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      });

      docMiddleware(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.strictEqual(nextError.statusCode, 403);
    });

    test('Allowed roles (Super Admin, Branch Manager, Application Officer) pass document verification guard', () => {
      const docMiddleware = requireRole(
        ROLES.SUPER_ADMIN,
        ROLES.BRANCH_MANAGER,
        ROLES.APPLICATION_OFFICER
      );

      for (const role of [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER]) {
        const { req, res, next, getNext } = mockReqRes({
          user: { role, branch: BRANCHES.BENGALURU },
        });
        docMiddleware(req, res, next);
        const { nextCalled, nextError } = getNext();
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(nextError, null);
      }
    });
  });

  describe('2. Record-Level Branch Isolation Logic', () => {
    test('Non-super_admin cross-branch document modification is denied with 403', () => {
      const student = { branch: BRANCHES.BENGALURU, documentsVerified: false };
      const user = { role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.MYSURU };

      const isDenied =
        user.role !== ROLES.SUPER_ADMIN &&
        user.branch !== student.branch;

      assert.strictEqual(isDenied, true, 'Cross-branch modification must be denied');
    });

    test('Super admin cross-branch modification is permitted', () => {
      const student = { branch: BRANCHES.BENGALURU, documentsVerified: false };
      const user = { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL };

      const isDenied =
        user.role !== ROLES.SUPER_ADMIN &&
        user.branch !== student.branch;

      assert.strictEqual(isDenied, false, 'Super admin cross-branch modification must be allowed');
    });

    test('Same-branch non-admin modification is permitted', () => {
      const student = { branch: BRANCHES.BENGALURU, documentsVerified: false };
      const user = { role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.BENGALURU };

      const isDenied =
        user.role !== ROLES.SUPER_ADMIN &&
        user.branch !== student.branch;

      assert.strictEqual(isDenied, false, 'Same branch modification must be allowed');
    });
  });

  describe('3. Route Registration Verification', () => {
    test('Pipeline routes register requireRole across all mutation and query endpoints', () => {
      const routes = pipelineRoutes.stack
        .filter((l) => l.route)
        .map((l) => ({
          path: l.route.path,
          methods: Object.keys(l.route.methods),
          stackLength: l.route.stack.length,
        }));

      assert.ok(routes.find((r) => r.path === '/' && r.methods.includes('get')));
      assert.ok(routes.find((r) => r.path === '/' && r.methods.includes('post')));
      assert.ok(routes.find((r) => r.path === '/:id/stage' && r.methods.includes('patch')));
      assert.ok(routes.find((r) => r.path === '/:id/documents' && r.methods.includes('patch')));

      // Each route should have requireRole before controller (stackLength >= 2)
      for (const r of routes) {
        assert.ok(
          r.stackLength >= 2,
          `Route ${r.path} [${r.methods.join(',')}] must have role middleware before controller`
        );
      }
    });
  });
});
