import React from 'react';
import { ROLES, ROLE_LABELS } from './constants';
import { useAuth } from '../context/AuthContext';

export { ROLES, ROLE_LABELS };

export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Full global cross-branch authority across all students, staff, reports, and system settings.',
  [ROLES.BRANCH_MANAGER]: 'Branch-level operational oversight for candidates, team assignments, and branch scorecards.',
  [ROLES.COUNSELLOR]: 'Student guidance, interaction logging, stage progression, and counseling task completion.',
  [ROLES.APPLICATION_OFFICER]: 'Document verification specialist, university application filings, and compliance audit.',
  [ROLES.MARKETING]: 'Lead acquisition, marketing campaign tracking, and prospective student enquiry creation.',
};

/**
 * Authoritative Client-Side Role Permission Matrix
 * Matches server/src/config/roles.js 1:1.
 * Prevents unauthorized UI rendering, form submission, and route actions on the client.
 */
export const ROLE_PERMISSIONS = {
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

// Backward-compatible alias for existing imports
export const PERMISSIONS = ROLE_PERMISSIONS;

/**
 * Check if a role has permission for a specific resource action on the client
 * @param {string} role - User role identifier
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {boolean}
 */
export function hasPermission(role, resource, action) {
  if (!role || !resource || !action) return false;
  const resourcePerms = ROLE_PERMISSIONS[resource];
  if (!resourcePerms) return false;
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles || !Array.isArray(allowedRoles)) return false;
  return allowedRoles.includes(role);
}

/**
 * Semantic shorthand: can(userRole, resource, action)
 */
export function can(role, resource, action) {
  return hasPermission(role, resource, action);
}

/**
 * Check if a role has ANY of the specified actions for a resource
 */
export function hasAnyPermission(role, resource, actions = []) {
  if (!role || !resource) return false;
  return actions.some((action) => hasPermission(role, resource, action));
}

/**
 * Get all permitted actions for a role across resources
 * @param {string} role
 * @returns {Record<string, string[]>}
 */
export function getRolePermissions(role) {
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
}

/**
 * React hook to check permission for the currently logged-in user
 * @param {string} resource
 * @param {string} action
 * @returns {{ allowed: boolean, role: string | null }}
 */
export function usePermission(resource, action) {
  const { user } = useAuth();
  const role = user?.role || null;
  const allowed = hasPermission(role, resource, action);
  return { allowed, role };
}

/**
 * Declarative UI Component to guard elements based on role permissions
 */
export function PermissionGate({
  resource,
  action,
  role = null,
  fallback = null,
  children,
}) {
  const { user } = useAuth();
  const effectiveRole = role || user?.role;
  const isAllowed = hasPermission(effectiveRole, resource, action);

  if (!isAllowed) {
    return fallback;
  }

  return React.createElement(React.Fragment, null, children);
}
