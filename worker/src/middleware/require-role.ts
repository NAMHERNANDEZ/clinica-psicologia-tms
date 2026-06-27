import type { User, Role } from '../types';
import { hasPermission, type Permission } from '../lib/rbac';

export function requireAuth(user: User | null): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'No autenticado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

export function requirePermission(user: User, permission: Permission): Response | null {
  if (!hasPermission(user.role, permission)) {
    return new Response(JSON.stringify({ success: false, error: 'Sin permisos' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

export function requireRole(user: User, ...roles: Role[]): Response | null {
  if (!roles.includes(user.role)) {
    return new Response(JSON.stringify({ success: false, error: 'Rol no autorizado' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
