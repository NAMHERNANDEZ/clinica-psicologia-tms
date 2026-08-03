import type { Role } from '../types';

export type Permission =
  | 'patients:read' | 'patients:write' | 'patients:delete'
  | 'therapists:read' | 'therapists:write' | 'therapists:delete'
  | 'appointments:read' | 'appointments:write' | 'appointments:delete'
  | 'tms:read' | 'tms:write' | 'tms:admin'
  | 'clinical:read' | 'clinical:write'
  | 'reports:read' | 'reports:write'
  | 'cos:read'
  | 'admin:access'
  | 'clinical_notes:read' | 'clinical_notes:write' | 'clinical_notes:delete'
  | 'sessions:read' | 'sessions:write'
  | 'templates:read' | 'templates:write' | 'templates:delete'
  | 'timeline:read' | 'timeline:write'
  | 'treatments:read' | 'treatments:write' | 'treatments:delete';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'patients:read', 'patients:write', 'patients:delete',
    'therapists:read', 'therapists:write', 'therapists:delete',
    'appointments:read', 'appointments:write', 'appointments:delete',
    'tms:read', 'tms:write', 'tms:admin',
    'clinical:read', 'clinical:write',
    'reports:read', 'reports:write',
    'cos:read',
    'admin:access',
  ],
  therapist: [
    'patients:read',
    'appointments:read',
    'tms:read', 'tms:write',
    'clinical:read', 'clinical:write',
    'reports:read',
  ],
  reception: [
    'patients:read', 'patients:write',
    'therapists:read',
    'appointments:read', 'appointments:write',
  ],
  patient: [
    'appointments:read',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}
