import { useContext } from 'react';
import { PermissionContext } from './PermissionContext';

export const usePermissions = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return ctx;
};

export const useHasPermission = (resource, action) => {
  const { hasPermission } = usePermissions();
  return hasPermission(resource, action);
};

export const useHasAnyPermission = (resource, actions) => {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(resource, actions);
};
