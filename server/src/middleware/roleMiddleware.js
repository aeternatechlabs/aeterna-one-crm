const { ApiError } = require('../utils/devilWrapper');
const { requirePermission, hasPermission } = require('../config/roles');

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles - Allowed roles
 * 
 * Usage:
 * router.get('/admin-only', protect, requireRole(ROLES.SUPER_ADMIN), handler);
 * router.get('/staff', protect, requireRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), handler);
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required before checking permissions.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: required role [${allowedRoles.join(', ')}], current role is [${req.user.role}].`
        )
      );
    }

    next();
  };
};

module.exports = { requireRole, requirePermission, hasPermission };
