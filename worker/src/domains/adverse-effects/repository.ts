import type { Env } from '../../types';

export interface AdverseEffect {
  id: number;
  clinic_id: number;
  tms_session_id: number;
  patient_id: number;
  effect_type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  onset_time?: string;
  duration_min?: number;
  resolved: number;
  action_taken?: string;
  created_at: string;
}

export interface EffectStats {
  effect_type: string;
  severity: string;
  count: number;
}

export async function findByPatient(env: Env, patientId: number): Promise<AdverseEffect[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM adverse_effects WHERE patient_id = ? ORDER BY created_at DESC'
  ).bind(patientId).all<AdverseEffect>();
  return results;
}

export async function findBySession(env: Env, tmsSessionId: number): Promise<AdverseEffect[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM adverse_effects WHERE tms_session_id = ? ORDER BY created_at DESC'
  ).bind(tmsSessionId).all<AdverseEffect>();
  return results;
}

export async function create(
  env: Env,
  clinicId: number,
  data: {
    patient_id: number;
    tms_session_id: number;
    effect_type: string;
    severity?: string;
    description?: string;
    onset_time?: string;
    duration_min?: number;
    action_taken?: string;
  }
): Promise<AdverseEffect> {
  const severity = data.severity || 'mild';
  const result = await env.DB.prepare(
    `INSERT INTO adverse_effects (clinic_id, patient_id, tms_session_id, effect_type, severity, description, onset_time, duration_min, resolved, action_taken, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))
     RETURNING *`
  )
    .bind(
      clinicId,
      data.patient_id,
      data.tms_session_id,
      data.effect_type,
      severity,
      data.description || null,
      data.onset_time || null,
      data.duration_min || null,
      data.action_taken || null
    )
    .first<AdverseEffect>();
  if (!result) throw new Error('Failed to create adverse effect');
  return result;
}

export async function markResolved(env: Env, id: number, actionTaken: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE adverse_effects SET resolved = 1, action_taken = ? WHERE id = ?"
  ).bind(actionTaken, id).run();
}

export async function getActiveEffects(env: Env, patientId: number): Promise<AdverseEffect[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM adverse_effects WHERE patient_id = ? AND resolved = 0 ORDER BY created_at DESC'
  ).bind(patientId).all<AdverseEffect>();
  return results;
}

export async function getEffectStats(env: Env, clinicId: number): Promise<EffectStats[]> {
  const { results } = await env.DB.prepare(
    `SELECT effect_type, severity, COUNT(*) as count
     FROM adverse_effects
     WHERE clinic_id = ?
     GROUP BY effect_type, severity
     ORDER BY effect_type, severity`
  ).bind(clinicId).all<EffectStats>();
  return results;
}