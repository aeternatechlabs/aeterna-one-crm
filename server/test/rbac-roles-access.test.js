const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  requirePermission,
} = require('../src/config/roles');
const { mockReqRes } = require('./helpers/testApp');
const { checkPermission, getPermissionsMatrix } = require('../src/modules/auth/auth.controller');

describe('RBAC Centralized Roles & Access Control Engine', () => {
  describe('1. Core Permission Helper: hasPermission', () => {
    test('Super admin has permission for all operations across all modules', () => {
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, 'pipeline', 'view'), true);
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, 'pipeline', 'moveStage'), true);
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, 'students', 'verifyDocs'), true);
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, 'students', 'deleteDocs'), true);
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, 'reports', 'export'), true);
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, 'settings', 'manageStaff'), true);
    });

    test('Branch manager has operational access but cannot delete docs or manage staff', () => {
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'pipeline', 'view'), true);
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'pipeline', 'moveStage'), true);
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'students', 'verifyDocs'), true);
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'students', 'deleteDocs'), false);
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'settings', 'manageStaff'), false);
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'reports', 'viewBranch'), true);
      assert.equal(hasPermission(ROLES.BRANCH_MANAGER, 'reports', 'viewAllBranches'), false);
    });

    test('Counsellor can view pipeline and move stage but cannot verify docs or view reports', () => {
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'pipeline', 'view'), true);
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'pipeline', 'moveStage'), true);
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'students', 'verifyDocs'), false);
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'reports', 'viewBranch'), false);
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'settings', 'view'), false);
    });

    test('Application Officer can verify docs and view pipeline, but cannot move stage or view settings', () => {
      assert.equal(hasPermission(ROLES.APPLICATION_OFFICER, 'pipeline', 'view'), true);
      assert.equal(hasPermission(ROLES.APPLICATION_OFFICER, 'students', 'verifyDocs'), true);
      assert.equal(hasPermission(ROLES.APPLICATION_OFFICER, 'pipeline', 'moveStage'), false);
      assert.equal(hasPermission(ROLES.APPLICATION_OFFICER, 'settings', 'view'), false);
      assert.equal(hasPermission(ROLES.APPLICATION_OFFICER, 'reports', 'viewBranch'), false);
    });

    test('Marketing role is restricted to leads and cannot access pipeline or student documents', () => {
      assert.equal(hasPermission(ROLES.MARKETING, 'leads', 'view'), true);
      assert.equal(hasPermission(ROLES.MARKETING, 'leads', 'create'), true);
      assert.equal(hasPermission(ROLES.MARKETING, 'pipeline', 'view'), false);
      assert.equal(hasPermission(ROLES.MARKETING, 'students', 'view'), false);
      assert.equal(hasPermission(ROLES.MARKETING, 'tasks', 'view'), false);
    });

    test('Invalid or unknown role/resource/action returns false safely', () => {
      assert.equal(hasPermission(null, 'pipeline', 'view'), false);
      assert.equal(hasPermission('unknown_role', 'pipeline', 'view'), false);
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'non_existent_resource', 'view'), false);
      assert.equal(hasPermission(ROLES.COUNSELLOR, 'pipeline', 'non_existent_action'), false);
    });
  });

  describe('2. Role Permission Dictionary: getRolePermissions', () => {
    test('getRolePermissions returns granular permitted action array for counsellor', () => {
      const perms = getRolePermissions(ROLES.COUNSELLOR);
      assert.ok(Array.isArray(perms.pipeline));
      assert.ok(perms.pipeline.includes('view'));
      assert.ok(perms.pipeline.includes('moveStage'));
      assert.ok(!perms.students.includes('verifyDocs'));
      assert.equal(perms.reports.length, 0);
    });
  });

  describe('3. Backend Middleware Enforcement: requirePermission', () => {
    test('requirePermission allows request when user has permission', () => {
      const middleware = requirePermission('pipeline', 'view');
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: 'bengaluru' },
      });

      middleware(req, res, next);
      const { nextCalled, nextError } = getNext();
      assert.equal(nextCalled, true);
      assert.equal(nextError, null);
    });

    test('requirePermission denies request with 403 when user lacks permission', () => {
      const middleware = requirePermission('students', 'verifyDocs');
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: 'bengaluru' },
      });

      middleware(req, res, next);
      const { nextCalled, nextError } = getNext();
      assert.equal(nextCalled, true);
      assert.ok(nextError, 'Expected error passed to next()');
      assert.equal(nextError.statusCode, 403);
      assert.match(nextError.message, /Access forbidden: role \[counsellor\] does not have permission/);
    });

    test('requirePermission returns 401 when req.user is missing', () => {
      const middleware = requirePermission('pipeline', 'view');
      const { req, res, next, getNext } = mockReqRes({ user: null });

      middleware(req, res, next);
      const { nextCalled, nextError } = getNext();
      assert.equal(nextCalled, true);
      assert.ok(nextError);
      assert.equal(nextError.statusCode, 401);
    });
  });

  describe('4. Auth Controller API Endpoints', () => {
    test('checkPermission returns allowed: true when authorized', async () => {
      const { req, res, next } = mockReqRes({
        user: { role: ROLES.APPLICATION_OFFICER },
        body: { resource: 'students', action: 'verifyDocs' },
      });

      await checkPermission(req, res, next);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.allowed, true);
      assert.equal(res.body.role, ROLES.APPLICATION_OFFICER);
      assert.match(res.body.message, /Access GRANTED/);
    });

    test('checkPermission returns allowed: false when unauthorized', async () => {
      const { req, res, next } = mockReqRes({
        user: { role: ROLES.COUNSELLOR },
        body: { resource: 'students', action: 'verifyDocs' },
      });

      await checkPermission(req, res, next);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.allowed, false);
      assert.equal(res.body.role, ROLES.COUNSELLOR);
      assert.match(res.body.message, /Access DENIED/);
    });

    test('checkPermission returns 403 when enforce: true and unauthorized', async () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.MARKETING },
        body: { resource: 'pipeline', action: 'view', enforce: true },
      });

      try {
        await checkPermission(req, res, next);
      } catch (err) {
        assert.equal(err.statusCode, 403);
      }
    });

    test('getPermissionsMatrix returns complete system roles, labels, and matrix', async () => {
      const { req, res, next } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN },
      });

      await getPermissionsMatrix(req, res, next);
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.roles);
      assert.ok(res.body.roleLabels);
      assert.ok(res.body.permissions);
      assert.equal(res.body.currentUserRole, ROLES.SUPER_ADMIN);
    });
  });
});
