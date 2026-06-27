import type { Role } from '../types';

export type Permission =
  | 'patients:read' | 'patients:write' | 'patients:delete'
  | 'therapists:read' | 'therapists:write' | 'therapists:delete'
  | 'appointments:read' | 'appointments:write' | 'appointments:delete';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'patients:read', 'patients:write', 'patients:delete',
    'therapists:read', 'therapists:write', 'therapists:delete',
    'appointments:read', 'appointments:write', 'appointments:delete',
  ],
  therapist: [
    'patients:read',
    'appointments:read',
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
