const { ApiError } = require('../utils/devilWrapper');
const { ROLES, BRANCHES } = require('../config/constants');

/**
 * Branch-Level Authorization Middleware
 * Ensures counsellors and branch managers only access data within their assigned branch.
 * Super admins have global cross-branch visibility.
 */
const requireBranchAccess = (branchParamName = 'branch') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required before checking branch access.'));
    }

    const userRole = req.user.role;
    const userBranch = req.user.branch;

    // Super admin or global role has unrestricted branch access
    if (userRole === ROLES.SUPER_ADMIN || userBranch === BRANCHES.ALL) {
      // Allow optional filtering by branch via query, params, or header
      const rawScope = req.query[branchParamName] || req.params[branchParamName] || req.headers['x-branch'] || null;
      req.branchScope =
        typeof rawScope === 'string'
          ? rawScope.trim().toLowerCase()
          : Array.isArray(rawScope) && typeof rawScope[0] === 'string'
          ? rawScope[0].trim().toLowerCase()
          : null;
      return next();
    }

    // Fail-Closed: Non-super-admin user must have a valid assigned branch
    if (!userBranch || typeof userBranch !== 'string' || !userBranch.trim()) {
      return next(new ApiError(403, 'Branch access denied: User account has no assigned branch.'));
    }

    // Explicit branch requested in query, params, or body
    const rawRequested = req.query[branchParamName] || req.params[branchParamName] || req.body[branchParamName];
    const requestedBranch =
      typeof rawRequested === 'string'
        ? rawRequested.trim().toLowerCase()
        : rawRequested
        ? String(rawRequested)
        : null;

    if (requestedBranch && requestedBranch !== userBranch) {
      return next(
        new ApiError(
          403,
          `Branch access denied: Your account is restricted to the '${userBranch}' branch. Cannot access '${requestedBranch}'.`
        )
      );
    }

    // Force query scope to assigned branch
    req.branchScope = userBranch;
    next();
  };
};

module.exports = { requireBranchAccess };
