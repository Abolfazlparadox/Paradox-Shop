'use client';

import { useAuthStore } from '@/stores/auth';

/**
 * Dynamic Role & Granular Permission Resolver Hook for Paradox Control Center.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  const isSuperUser = Boolean(user?.is_superuser);
  const permissions = user?.permissions || [];

  /**
   * Evaluates if current authenticated administrator has the specified permission.
   * Superusers or wildcard '*' bypass all restrictions.
   */
  const can = (permission: string): boolean => {
    if (!isStaff) return false;
    if (isSuperUser || permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  /**
   * Checks if user has ANY of the provided permissions.
   */
  const canAny = (perms: string[]): boolean => {
    if (!isStaff) return false;
    if (isSuperUser || permissions.includes('*')) return true;
    return perms.some((p) => permissions.includes(p));
  };

  return {
    user,
    isStaff,
    isSuperUser,
    permissions,
    can,
    canAny,
  };
}
