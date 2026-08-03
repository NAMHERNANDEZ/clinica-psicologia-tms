import { describe, it, expect } from 'vitest';
import { requireRole, requireAuth } from '../src/middleware/require-role';
import { hasPermission } from '../src/lib/rbac';
import type { User } from '../src/types';
import { LEAD_ESTADOS } from '../src/domains/leads/repository';
import { LEAD_ESTADOS_VALIDOS } from '../src/domains/leads/validators';
import { validateLeadCreate, validateEstado } from '../src/domains/leads/validators';

const admin: User = { id: 1, clinic_id: 1, email: 'admin@test.mx', role: 'admin', password_hash: '', created_at: '' };
const therapist: User = { id: 2, clinic_id: 1, email: 't@test.mx', role: 'therapist', password_hash: '', created_at: '' };
const patient: User = { id: 3, clinic_id: 1, email: 'p@test.mx', role: 'patient', password_hash: '', created_at: '' };

describe('Dashboard RBAC - rutas de leads protegidas', () => {
  it('admin puede acceder a rutas de leads', () => {
    expect(requireRole(admin, 'admin')).toBeNull();
  });

  it('therapist NO puede acceder a rutas de leads (403)', () => {
    const res = requireRole(therapist, 'admin');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('patient NO puede acceder a rutas de leads (403)', () => {
    const res = requireRole(patient, 'admin');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('usuario no autenticado no puede (401)', () => {
    const res = requireAuth(null);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });
});

describe('Dashboard RBAC - permisos', () => {
  it('admin tiene acceso de administracion', () => {
    expect(hasPermission('admin', 'admin:access')).toBe(true);
  });

  it('therapist no tiene acceso de administracion', () => {
    expect(hasPermission('therapist', 'admin:access')).toBe(false);
  });

  it('patient no tiene acceso de administracion', () => {
    expect(hasPermission('patient', 'admin:access')).toBe(false);
  });
});

describe('Dashboard - estados de lead', () => {
  it('existen exactamente 5 estados validos', () => {
    expect(LEAD_ESTADOS).toEqual(['NUEVO', 'CONTACTADO', 'CITA_CONFIRMADA', 'ATENDIDO', 'CERRADO']);
    expect(LEAD_ESTADOS_VALIDOS).toEqual(LEAD_ESTADOS);
  });

  it('validates estados correctamente', () => {
    expect(validateEstado('NUEVO').valid).toBe(true);
    expect(validateEstado('CONTACTADO').valid).toBe(true);
    expect(validateEstado('CITA_CONFIRMADA').valid).toBe(true);
    expect(validateEstado('ATENDIDO').valid).toBe(true);
    expect(validateEstado('CERRADO').valid).toBe(true);
    expect(validateEstado('invalido').valid).toBe(false);
  });
});

describe('Dashboard - validacion de creacion de lead', () => {
  it('rechaza un lead sin datos de contacto', () => {
    expect(validateLeadCreate({}).valid).toBe(false);
  });

  it('acepta un lead con nombre y servicio', () => {
    const res = validateLeadCreate({ nombre: 'Ana', servicio_interesado: 'TMS' });
    expect(res.valid).toBe(true);
  });

  it('fuerza origen por defecto a chat', () => {
    const res = validateLeadCreate({ telefono: '5512345678' });
    expect(res.valid).toBe(true);
    expect(res.data!.origen).toBe('chat');
  });
});

describe('Dashboard - auditoria de cambio de estado', () => {
  const auditCalls: Array<Record<string, unknown>> = [];

  const makeEnv = (estadoInicial: string) => {
    auditCalls.length = 0;
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          all: async () => ({
            results: estadoInicial ? [{ id: 5, estado: estadoInicial }] : [],
          }),
          run: async () => {
            auditCalls.push({ sql, args });
            return { meta: { changes: 1 } };
          },
          first: async () => null,
        }),
      }),
    };
    return { DB: mockDb } as unknown as import('../src/types').Env;
  };

  it('registra auditoria al cambiar estado', async () => {
    const env = makeEnv('NUEVO');
    const { updateLeadEstado } = await import('../src/domains/leads/service');
    const result = await updateLeadEstado(env, 5, 1, 'CONTACTADO', { id: 9, email: 'admin@test.mx' });
    expect(result.updated).toBe(true);
    // Se debe haber registrado al menos un INSERT en lead_audit con el cambio NUEVO->CONTACTADO
    const auditInsert = auditCalls.find((c) => String(c.sql).includes('lead_audit') && String(c.sql).includes('INSERT'));
    expect(auditInsert).toBeDefined();
    expect(auditInsert!.args).toContain('cambio_estado');
    expect(auditInsert!.args).toContain('NUEVO');
    expect(auditInsert!.args).toContain('CONTACTADO');
  });

  it('no registra auditoria si el lead no existe', async () => {
    const env = makeEnv('');
    const { updateLeadEstado } = await import('../src/domains/leads/service');
    const result = await updateLeadEstado(env, 999, 1, 'CONTACTADO');
    expect(result.updated).toBe(false);
    expect(auditCalls.length).toBe(0);
  });
});
