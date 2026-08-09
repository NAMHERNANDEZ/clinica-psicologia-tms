import { describe, it, expect } from 'vitest';
import { hasPermission, type Permission } from '../src/lib/rbac';

describe('RBAC', () => {
  describe('Admin permissions', () => {
    it('should have all permissions', () => {
      const adminPermissions: Permission[] = [
        'patients:read', 'patients:write', 'patients:delete',
        'therapists:read', 'therapists:write', 'therapists:delete',
        'appointments:read', 'appointments:write', 'appointments:delete',
        'tms:read', 'tms:write', 'tms:admin',
        'clinical:read', 'clinical:write',
        'reports:read', 'reports:write',
        'cos:read',
        'admin:access',
        'clinical_notes:read', 'clinical_notes:write', 'clinical_notes:delete',
        'note_templates:read', 'note_templates:write',
        'sessions:read', 'sessions:write',
        'templates:read', 'templates:write', 'templates:delete',
        'timeline:read', 'timeline:write',
        'treatments:read', 'treatments:write', 'treatments:delete',
        'documents:read', 'documents:write', 'documents:sign', 'documents:archive',
      ];

      adminPermissions.forEach((perm) => {
        expect(hasPermission('admin', perm)).toBe(true);
      });
    });
  });

  describe('Therapist permissions', () => {
    it('should have limited permissions', () => {
      expect(hasPermission('therapist', 'patients:read')).toBe(true);
      expect(hasPermission('therapist', 'appointments:read')).toBe(true);
      expect(hasPermission('therapist', 'clinical_notes:read')).toBe(true);
      expect(hasPermission('therapist', 'clinical_notes:write')).toBe(true);
      expect(hasPermission('therapist', 'sessions:read')).toBe(true);
      expect(hasPermission('therapist', 'treatments:write')).toBe(true);
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
      expect(hasPermission('patient', 'appointments:read')).toBe(true);
      expect(hasPermission('patient', 'documents:read')).toBe(true);
    });

    it('should not have write permissions', () => {
      expect(hasPermission('patient', 'patients:write')).toBe(false);
      expect(hasPermission('patient', 'appointments:write')).toBe(false);
      expect(hasPermission('patient', 'therapists:read')).toBe(false);
      expect(hasPermission('patient', 'dashboard:read')).toBe(false);
      expect(hasPermission('patient', 'patients:read')).toBe(false);
    });
  });

  describe('Unknown role', () => {
    it('should have no permissions', () => {
      expect(hasPermission('unknown', 'patients:read')).toBe(false);
    });
  });
});
