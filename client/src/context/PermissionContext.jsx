import React, { createContext, useMemo } from 'react';
import { useAuth } from './useAuth';
import { hasPermission, hasAnyPermission, PERMISSIONS } from '../config/permissions';
import { BRANCHES, ROLES } from '../config/constants';

export const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();

  const value = useMemo(() => {
    if (!user) {
      return {
        role: null,
        branch: null,
        canAccessAllBranches: false,
        hasPermission: () => false,
        hasAnyPermission: () => false,
      };
    }

    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
    const canAccessAllBranches = isSuperAdmin || user.branch === BRANCHES.ALL;

    return {
      role: user.role,
      branch: user.branch,
      canAccessAllBranches,
      hasPermission: (resource, action) => hasPermission(user.role, resource, action),
      hasAnyPermission: (resource, actions) => hasAnyPermission(user.role, resource, actions),
      allPermissions: PERMISSIONS,
    };
  }, [user]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export { usePermissions, useHasPermission, useHasAnyPermission } from './usePermissions';
