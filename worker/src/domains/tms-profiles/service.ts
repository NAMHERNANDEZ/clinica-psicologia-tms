import type { Env } from '../../types';
import * as repo from './repository';
import type { TmsProfileInput, TmsProfileStatus } from './validators';

export async function getPatientProfiles(env: Env, patientId: number) {
  const profiles = await repo.findByPatient(env, patientId);
  return { success: true, data: { profiles } };
}

export async function getClinicProfiles(env: Env, clinicId: number) {
  const profiles = await repo.findByClinic(env, clinicId);
  return { success: true, data: { profiles } };
}

export async function getProfile(env: Env, id: number) {
  const profile = await repo.findById(env, id);
  if (!profile) return { success: false, error: 'Perfil no encontrado', status: 404 };

  const sessions = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM tms_sessions WHERE profile_id = ?`
  ).bind(id).first() as { total: number } | null;

  return {
    success: true,
    data: {
      profile,
      progress: {
        total_sessions: profile.start_date ? (sessions?.total || 0) : 0,
      },
    },
  };
}

export async function createProfile(env: Env, clinicId: number, data: TmsProfileInput) {
  const active = await repo.findActiveByPatient(env, data.patient_id);
  if (active) {
    return { success: false, error: 'El paciente ya tiene un perfil activo', status: 400 };
  }

  const id = await repo.create(env, clinicId, data);
  return { success: true, data: { id } };
}

export async function activateProfile(env: Env, id: number) {
  const existing = await repo.findById(env, id);
  if (!existing) return { success: false, error: 'Perfil no encontrado', status: 404 };

  const active = await repo.findActiveByPatient(env, existing.patient_id);
  if (active && active.id !== id) {
    return { success: false, error: 'El paciente ya tiene un perfil activo', status: 400 };
  }

  const success = await repo.updateStatus(env, id, 'active');
  if (!success) return { success: false, error: 'No se pudo activar el perfil', status: 500 };

  await env.DB.prepare(
    `UPDATE tms_patient_profiles SET start_date = ? WHERE id = ? AND start_date IS NULL`
  ).bind(new Date().toISOString(), id).run();

  return { success: true, data: null };
}

export async function completeProfile(env: Env, id: number) {
  const existing = await repo.findById(env, id);
  if (!existing) return { success: false, error: 'Perfil no encontrado', status: 404 };
  if (existing.status !== 'active') {
    return { success: false, error: 'Solo se pueden completar perfiles activos', status: 400 };
  }

  const success = await repo.updateStatus(env, id, 'completed');
  if (!success) return { success: false, error: 'No se pudo completar el perfil', status: 500 };

  return { success: true, data: null };
}

export async function discontinueProfile(env: Env, id: number) {
  const existing = await repo.findById(env, id);
  if (!existing) return { success: false, error: 'Perfil no encontrado', status: 404 };
  if (existing.status === 'completed' || existing.status === 'discontinued') {
    return { success: false, error: 'El perfil ya no está activo', status: 400 };
  }

  const success = await repo.updateStatus(env, id, 'discontinued');
  if (!success) return { success: false, error: 'No se pudo descontinuar el perfil', status: 500 };

  return { success: true, data: null };
}
