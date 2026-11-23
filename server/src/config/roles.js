const { ApiError } = require('../utils/devilWrapper');
const { ROLES } = require('./constants');

const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Founder / Super Admin',
  [ROLES.BRANCH_MANAGER]: 'Branch Manager',
  [ROLES.COUNSELLOR]: 'Education Counsellor',
  [ROLES.MARKETING]: 'Marketing Lead',
  [ROLES.APPLICATION_OFFICER]: 'Application Officer',
};

const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Full global cross-branch authority across all students, staff, reports, and system settings.',
  [ROLES.BRANCH_MANAGER]: 'Branch-level operational oversight for candidates, team assignments, and branch scorecards.',
  [ROLES.COUNSELLOR]: 'Student guidance, interaction logging, stage progression, and counseling task completion.',
  [ROLES.APPLICATION_OFFICER]: 'Document verification specialist, university application filings, and compliance audit.',
  [ROLES.MARKETING]: 'Lead acquisition, marketing campaign tracking, and prospective student enquiry creation.',
};

/**
 * Authoritative Server-Side Role Permission Matrix
 * Governs all API endpoints, resource access, and administrative actions.
 */
const ROLE_PERMISSIONS = {
  leads: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.MARKETING],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.MARKETING],
    update: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    assign: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
    delete: [ROLES.SUPER_ADMIN],
    export: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
  },
  pipeline: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    moveStage: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    overrideStage: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
  },
  students: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    updateNotes: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    uploadDocs: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    verifyDocs: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER],
    deleteDocs: [ROLES.SUPER_ADMIN],
  },
  tasks: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    complete: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    reassign: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
  },
  reports: {
    viewBranch: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
    viewAllBranches: [ROLES.SUPER_ADMIN],
    export: [ROLES.SUPER_ADMIN],
  },
  settings: {
    view: [ROLES.SUPER_ADMIN],
    manageStaff: [ROLES.SUPER_ADMIN],
    manageBranches: [ROLES.SUPER_ADMIN],
    manageIntegrations: [ROLES.SUPER_ADMIN],
    viewAuditLogs: [ROLES.SUPER_ADMIN],
  },
};

/**
 * Check if a role has permission for a specific resource action on the server
 * @param {string} role - User role identifier
 * @param {string} resource - Resource name (e.g., 'pipeline', 'students')
 * @param {string} action - Action name (e.g., 'view', 'verifyDocs')
 * @returns {boolean}
 */
const hasPermission = (role, resource, action) => {
  if (!role || !resource || !action) return false;
  const resourcePerms = ROLE_PERMISSIONS[resource];
  if (!resourcePerms) return false;
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles || !Array.isArray(allowedRoles)) return false;
  return allowedRoles.includes(role);
};

/**
 * Get all permitted actions for a specific role across all resources
 * @param {string} role - User role identifier
 * @returns {Record<string, string[]>}
 */
const getRolePermissions = (role) => {
  if (!role) return {};
  const permissions = {};
  for (const [resource, actions] of Object.entries(ROLE_PERMISSIONS)) {
    permissions[resource] = [];
    for (const [action, allowedRoles] of Object.entries(actions)) {
      if (allowedRoles.includes(role)) {
        permissions[resource].push(action);
      }
    }
  }
  return permissions;
};

/**
 * Get the list of roles allowed for a specific resource action
 * @param {string} resource
 * @param {string} action
 * @returns {string[]}
 */
const getAllowedRoles = (resource, action) => {
  const resourcePerms = ROLE_PERMISSIONS[resource];
  if (!resourcePerms || !resourcePerms[action]) return [];
  return resourcePerms[action];
};

/**
 * Express middleware to enforce resource-action permissions on backend routes
 * Returns HTTP 403 Forbidden if user's role lacks the requested permission
 * @param {string} resource - Target resource name
 * @param {string} action - Target action name
 */
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required before checking permissions.'));
    }

    if (!hasPermission(req.user.role, resource, action)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: role [${req.user.role}] does not have permission for [${resource}:${action}].`
        )
      );
    }

    next();
  };
};

module.exports = {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getAllowedRoles,
  requirePermission,
};
