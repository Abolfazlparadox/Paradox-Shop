import { describe, test, expect } from 'vitest';

describe('Granular RBAC & Permission Resolver Matrix', () => {
  function evaluatePermissions(
    isStaff: boolean,
    isSuperUser: boolean,
    permissions: string[]
  ) {
    const hasWildcard = permissions.includes('*') || isSuperUser;

    const can = (permission: string): boolean => {
      if (!isStaff && !isSuperUser) return false;
      if (hasWildcard) return true;
      if (permissions.includes(permission)) return true;

      const [domain] = permission.split('.');
      if (permissions.includes(`${domain}.*`)) return true;

      return false;
    };

    const canAny = (perms: string[]): boolean => {
      return perms.some((p) => can(p));
    };

    return { can, canAny };
  }

  test('Superuser automatically passes all capability checks', () => {
    const rbac = evaluatePermissions(true, true, ['*']);
    expect(rbac.can('orders.view')).toBe(true);
    expect(rbac.can('orders.update')).toBe(true);
    expect(rbac.can('inventory.update')).toBe(true);
    expect(rbac.can('settings.manage')).toBe(true);
    expect(rbac.can('audit.view')).toBe(true);
  });

  test('Staff with specific permissions only accesses authorized domains', () => {
    const rbac = evaluatePermissions(true, false, ['orders.view', 'orders.update', 'products.view']);
    expect(rbac.can('orders.view')).toBe(true);
    expect(rbac.can('orders.update')).toBe(true);
    expect(rbac.can('products.view')).toBe(true);
    expect(rbac.can('products.create')).toBe(false);
    expect(rbac.can('inventory.update')).toBe(false);
    expect(rbac.can('settings.manage')).toBe(false);
  });

  test('Domain wildcard allows all actions within that domain', () => {
    const rbac = evaluatePermissions(true, false, ['products.*', 'analytics.view']);
    expect(rbac.can('products.view')).toBe(true);
    expect(rbac.can('products.create')).toBe(true);
    expect(rbac.can('products.delete')).toBe(true);
    expect(rbac.can('analytics.view')).toBe(true);
    expect(rbac.can('orders.update')).toBe(false);
  });

  test('canAny returns true if at least one permission matches', () => {
    const rbac = evaluatePermissions(true, false, ['reviews.view']);
    expect(rbac.canAny(['orders.view', 'reviews.view'])).toBe(true);
    expect(rbac.canAny(['orders.view', 'products.view'])).toBe(false);
  });

  test('Non-staff user is denied all admin permissions even if assigned raw list', () => {
    const rbac = evaluatePermissions(false, false, ['orders.view', 'settings.manage']);
    expect(rbac.can('orders.view')).toBe(false);
    expect(rbac.can('settings.manage')).toBe(false);
    expect(rbac.canAny(['orders.view', 'settings.manage'])).toBe(false);
  });
});
