// ==========================================
// Admin RBAC & Authentication Guard Unit Tests
// ==========================================

import { describe, test, expect } from 'vitest';

describe('Admin Authentication & RBAC Rules', () => {
  interface MockUser {
    id: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
  }

  function checkAdminAccess(user: MockUser | null, isAuthenticated: boolean): boolean {
    if (!isAuthenticated || !user) return false;
    return Boolean(user.is_staff || user.is_superuser);
  }

  test('Denies access when user is not authenticated', () => {
    const result = checkAdminAccess(null, false);
    expect(result).toBe(false);
  });

  test('Denies access when regular customer logs in without staff claims', () => {
    const regularCustomer: MockUser = {
      id: 'cust-1',
      email: 'customer@example.com',
      is_staff: false,
      is_superuser: false,
    };
    const result = checkAdminAccess(regularCustomer, true);
    expect(result).toBe(false);
  });

  test('Grants access when user has is_staff claim', () => {
    const staffUser: MockUser = {
      id: 'staff-1',
      email: 'staff@paradox.art',
      is_staff: true,
      is_superuser: false,
    };
    const result = checkAdminAccess(staffUser, true);
    expect(result).toBe(true);
  });

  test('Grants access when user is superuser', () => {
    const superUser: MockUser = {
      id: 'super-1',
      email: 'director@paradox.art',
      is_staff: false,
      is_superuser: true,
    };
    const result = checkAdminAccess(superUser, true);
    expect(result).toBe(true);
  });
});
