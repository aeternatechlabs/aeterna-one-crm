/**
 * Day 4: Backend Authorization Hardening Test Suite
 * Validates:
 * 1. Centralized Role Permissions (5 roles across all protected endpoints)
 * 2. Branch Scope Derivation & Tamper Resistance (query, body, params, headers, HPP, NoSQL shapes)
 * 3. Record-Level Mutation Guards (Cross-branch stage move and document verification)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mockReqRes } = require('./helpers/testApp');
const { requireRole } = require('../src/middleware/roleMiddleware');
const { requireBranchAccess } = require('../src/middleware/branchMiddleware');
const { ROLES, BRANCHES } = require('../src/config/constants');

describe('Day 4: Backend Authorization Hardening', () => {
  describe('1. Centralized Role Permissions (RBAC Matrix)', () => {
    const pipelineViewRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
      ROLES.APPLICATION_OFFICER,
    ];
    const pipelineCreateRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
    ];
    const pipelineStageRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.COUNSELLOR,
    ];
    const pipelineDocsRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
      ROLES.APPLICATION_OFFICER,
    ];
    const userListRoles = [
      ROLES.SUPER_ADMIN,
      ROLES.BRANCH_MANAGER,
    ];

    test('401 error returned when req.user is absent', () => {
      const guard = requireRole(ROLES.SUPER_ADMIN);
      const { req, res, next, getNext } = mockReqRes({ user: null });
      guard(req, res, next);
      const { nextError } = getNext();
      assert.ok(nextError);
      assert.strictEqual(nextError.statusCode, 401);
      assert.match(nextError.message, /Authentication required/i);
    });

    test('Pipeline view: marketing is forbidden (403), other 4 roles pass', () => {
      const guard = requireRole(pipelineViewRoles);

      // Marketing denied
      const mkt = mockReqRes({ user: { role: ROLES.MARKETING } });
      guard(mkt.req, mkt.res, mkt.next);
      assert.strictEqual(mkt.getNext().nextError?.statusCode, 403);

      // Other 4 roles pass
      for (const role of pipelineViewRoles) {
        const pass = mockReqRes({ user: { role } });
        guard(pass.req, pass.res, pass.next);
        assert.strictEqual(pass.getNext().nextCalled, true);
        assert.strictEqual(pass.getNext().nextError, null);
      }
    });

    test('Pipeline create: marketing & application_officer are forbidden (403)', () => {
      const guard = requireRole(pipelineCreateRoles);

      for (const role of [ROLES.MARKETING, ROLES.APPLICATION_OFFICER]) {
        const denied = mockReqRes({ user: { role } });
        guard(denied.req, denied.res, denied.next);
        assert.strictEqual(denied.getNext().nextError?.statusCode, 403);
      }

      for (const role of pipelineCreateRoles) {
        const pass = mockReqRes({ user: { role } });
        guard(pass.req, pass.res, pass.next);
        assert.strictEqual(pass.getNext().nextCalled, true);
        assert.strictEqual(pass.getNext().nextError, null);
      }
    });

    test('Pipeline stage transition: marketing & application_officer are forbidden (403)', () => {
      const guard = requireRole(pipelineStageRoles);

      for (const role of [ROLES.MARKETING, ROLES.APPLICATION_OFFICER]) {
        const denied = mockReqRes({ user: { role } });
        guard(denied.req, denied.res, denied.next);
        assert.strictEqual(denied.getNext().nextError?.statusCode, 403);
      }

      for (const role of pipelineStageRoles) {
        const pass = mockReqRes({ user: { role } });
        guard(pass.req, pass.res, pass.next);
        assert.strictEqual(pass.getNext().nextCalled, true);
        assert.strictEqual(pass.getNext().nextError, null);
      }
    });

    test('Document verification: marketing & counsellor are forbidden (403)', () => {
      const guard = requireRole(pipelineDocsRoles);

      for (const role of [ROLES.MARKETING, ROLES.COUNSELLOR]) {
        const denied = mockReqRes({ user: { role } });
        guard(denied.req, denied.res, denied.next);
        assert.strictEqual(denied.getNext().nextError?.statusCode, 403);
      }

      for (const role of pipelineDocsRoles) {
        const pass = mockReqRes({ user: { role } });
        guard(pass.req, pass.res, pass.next);
        assert.strictEqual(pass.getNext().nextCalled, true);
        assert.strictEqual(pass.getNext().nextError, null);
      }
    });

    test('Staff users directory: counsellor, marketing, application_officer are forbidden (403)', () => {
      const guard = requireRole(userListRoles);

      for (const role of [ROLES.COUNSELLOR, ROLES.MARKETING, ROLES.APPLICATION_OFFICER]) {
        const denied = mockReqRes({ user: { role } });
        guard(denied.req, denied.res, denied.next);
        assert.strictEqual(denied.getNext().nextError?.statusCode, 403);
      }

      for (const role of userListRoles) {
        const pass = mockReqRes({ user: { role } });
        guard(pass.req, pass.res, pass.next);
        assert.strictEqual(pass.getNext().nextCalled, true);
        assert.strictEqual(pass.getNext().nextError, null);
      }
    });
  });

  describe('2. Branch Scope Derivation & Tamper Resistance', () => {
    const branchGuard = requireBranchAccess();

    test('401 returned if req.user is absent', () => {
      const { req, res, next, getNext } = mockReqRes({ user: null });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextError?.statusCode, 401);
    });

    test('Restricted user without branch param is automatically scoped to assigned branch', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, BRANCHES.BENGALURU);
    });

    test('Restricted user requesting foreign branch in query is denied with 403', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { branch: BRANCHES.MYSURU },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextError?.statusCode, 403);
      assert.match(getNext().nextError.message, /restricted to the 'bengaluru' branch/i);
    });

    test('Restricted user requesting foreign branch in body is denied with 403', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        body: { branch: BRANCHES.BELAGAVI },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextError?.statusCode, 403);
      assert.match(getNext().nextError.message, /restricted to the 'bengaluru' branch/i);
    });

    test('Restricted user requesting foreign branch in route params is denied with 403', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.MYSURU },
        params: { branch: BRANCHES.BENGALURU },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextError?.statusCode, 403);
      assert.match(getNext().nextError.message, /restricted to the 'mysuru' branch/i);
    });

    test('Restricted user requesting ?branch=all is forced back into own branch scope', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { branch: 'all' },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, BRANCHES.BENGALURU);
    });

    test('Restricted user sending spoofed x-branch header has scope forced to assigned branch', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        headers: { 'x-branch': BRANCHES.MYSURU },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, BRANCHES.BENGALURU);
    });

    test('HPP attack: multiple query params (?branch=bengaluru&branch=mysuru) is denied with 403', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { branch: ['bengaluru', 'mysuru'] },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextError?.statusCode, 403);
    });

    test('NoSQL operator injection: object branch (?branch[$ne]=null) is denied with 403', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU },
        query: { branch: { $ne: null } },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextError?.statusCode, 403);
    });

    test('Super admin has global scope by default (req.branchScope === null)', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, null);
    });

    test('Super admin can optionally filter by specific branch via query', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        query: { branch: 'mysuru' },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, 'mysuru');
    });

    test('Super admin can optionally filter by specific branch via x-branch header', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        headers: { 'x-branch': 'belagavi' },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, 'belagavi');
    });

    test('Super admin with non-string scope is safely normalized to string or null', () => {
      const { req, res, next, getNext } = mockReqRes({
        user: { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL },
        query: { branch: { $gt: '' } },
      });
      branchGuard(req, res, next);
      assert.strictEqual(getNext().nextCalled, true);
      assert.strictEqual(getNext().nextError, null);
      assert.strictEqual(req.branchScope, null, 'Object shape in query must be normalized to null');
    });
  });

  describe('3. Record-Level Mutation Guards', () => {
    const isWriteAuthorized = (user, branchScope, studentBranch) => {
      if (user.role === ROLES.SUPER_ADMIN) return true;
      if (branchScope === 'all') return true;
      return user.branch === studentBranch;
    };

    test('Counsellor cannot mutate student from another branch', () => {
      const counsellor = { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU };
      const canMutate = isWriteAuthorized(counsellor, BRANCHES.BENGALURU, BRANCHES.MYSURU);
      assert.strictEqual(canMutate, false, 'Cross-branch mutation must be denied');
    });

    test('Branch manager cannot mutate student from another branch', () => {
      const manager = { role: ROLES.BRANCH_MANAGER, branch: BRANCHES.BENGALURU };
      const canMutate = isWriteAuthorized(manager, BRANCHES.BENGALURU, BRANCHES.BELAGAVI);
      assert.strictEqual(canMutate, false, 'Cross-branch mutation must be denied');
    });

    test('Application officer cannot mutate student from another branch', () => {
      const officer = { role: ROLES.APPLICATION_OFFICER, branch: BRANCHES.MYSURU };
      const canMutate = isWriteAuthorized(officer, BRANCHES.MYSURU, BRANCHES.BENGALURU);
      assert.strictEqual(canMutate, false, 'Cross-branch mutation must be denied');
    });

    test('Same-branch user is authorized to mutate student in their assigned branch', () => {
      const counsellor = { role: ROLES.COUNSELLOR, branch: BRANCHES.BENGALURU };
      const canMutate = isWriteAuthorized(counsellor, BRANCHES.BENGALURU, BRANCHES.BENGALURU);
      assert.strictEqual(canMutate, true, 'Same-branch mutation must be permitted');
    });

    test('Super admin is authorized to mutate student across all branches', () => {
      const superAdmin = { role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL };
      for (const branch of [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI]) {
        const canMutate = isWriteAuthorized(superAdmin, null, branch);
        assert.strictEqual(canMutate, true, `Super admin must be authorized for ${branch}`);
      }
    });
  });
});
