import { ROLES } from './constants';

/**
 * Aeterna One CRM — Centralized Permissions Matrix
 * Single source of truth for resource-level actions permitted per role.
 */
export const PERMISSIONS = {
  // Lead Management
  leads: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.MARKETING],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.MARKETING],
    update: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    assign: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
    delete: [ROLES.SUPER_ADMIN],
    export: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
  },

  // Admissions Pipeline
  pipeline: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    moveStage: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    overrideStage: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
  },

  // Student 360 & Documents
  students: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    updateNotes: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    uploadDocs: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR, ROLES.APPLICATION_OFFICER],
    verifyDocs: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.APPLICATION_OFFICER],
    deleteDocs: [ROLES.SUPER_ADMIN],
  },

  // Tasks & Follow-ups
  tasks: {
    view: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    create: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    complete: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.COUNSELLOR],
    reassign: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
  },

  // Management Reports & Analytics
  reports: {
    viewBranch: [ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER],
    viewAllBranches: [ROLES.SUPER_ADMIN],
    export: [ROLES.SUPER_ADMIN],
  },

  // System Settings & Staff Management
  settings: {
    view: [ROLES.SUPER_ADMIN],
    manageStaff: [ROLES.SUPER_ADMIN],
    manageBranches: [ROLES.SUPER_ADMIN],
    manageIntegrations: [ROLES.SUPER_ADMIN],
  },
};

/**
 * Check if a role has permission for a specific resource action
 */
export function hasPermission(role, resource, action) {
  if (!role || !resource || !action) return false;
  const resourcePerms = PERMISSIONS[resource];
  if (!resourcePerms) return false;
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Check if a role has ANY of the listed actions for a resource
 */
export function hasAnyPermission(role, resource, actions = []) {
  if (!role || !resource) return false;
  return actions.some((act) => hasPermission(role, resource, act));
}
