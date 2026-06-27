import { describe, it, expect } from 'vitest';
import { hasPermission, type Permission } from '../src/lib/rbac';

describe('RBAC', () => {
  describe('Admin permissions', () => {
    it('should have all permissions', () => {
      const adminPermissions: Permission[] = [
        'patients:read', 'patients:write', 'patients:delete',
        'therapists:read', 'therapists:write', 'therapists:delete',
        'appointments:read', 'appointments:write', 'appointments:delete',
        'notes:read', 'notes:write',
        'dashboard:read', 'audit:read', 'users:write',
      ];

      adminPermissions.forEach((perm) => {
        expect(hasPermission('admin', perm)).toBe(true);
      });
    });
  });

  describe('Therapist permissions', () => {
    it('should have limited permissions', () => {
      expect(hasPermission('therapist', 'patients:read')).toBe(true);
      expect(hasPermission('therapist', 'appointments:read_own')).toBe(true);
      expect(hasPermission('therapist', 'appointments:write_own')).toBe(true);
      expect(hasPermission('therapist', 'notes:read')).toBe(true);
      expect(hasPermission('therapist', 'notes:write')).toBe(true);
    });

    it('should not have admin permissions', () => {
      expect(hasPermission('therapist', 'patients:write')).toBe(false);
      expect(hasPermission('therapist', 'patients:delete')).toBe(false);
      expect(hasPermission('therapist', 'therapists:write')).toBe(false);
      expect(hasPermission('therapist', 'dashboard:read')).toBe(false);
      expect(hasPermission('therapist', 'audit:read')).toBe(false);
    });
  });

  describe('Patient permissions', () => {
    it('should have minimal permissions', () => {
      expect(hasPermission('patient', 'appointments:read_own')).toBe(true);
      expect(hasPermission('patient', 'patients:read')).toBe(true);
    });

    it('should not have write permissions', () => {
      expect(hasPermission('patient', 'patients:write')).toBe(false);
      expect(hasPermission('patient', 'appointments:write')).toBe(false);
      expect(hasPermission('patient', 'therapists:read')).toBe(false);
      expect(hasPermission('patient', 'dashboard:read')).toBe(false);
    });
  });

  describe('Unknown role', () => {
    it('should have no permissions', () => {
      expect(hasPermission('unknown', 'patients:read')).toBe(false);
    });
  });
});
