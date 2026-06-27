import type { Env } from '../../types';
import * as repository from './repository';
import { validateCreateEffect, validateResolveEffect } from './validators';

export async function getPatientEffects(env: Env, patientId: number): Promise<repository.AdverseEffect[]> {
  return repository.findByPatient(env, patientId);
}

export async function getSessionEffects(env: Env, tmsSessionId: number): Promise<repository.AdverseEffect[]> {
  return repository.findBySession(env, tmsSessionId);
}

export async function recordEffect(
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
): Promise<repository.AdverseEffect> {
  const validation = validateCreateEffect(data);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  }
  return repository.create(env, clinicId, data);
}

export async function resolveEffect(
  env: Env,
  id: number,
  actionTaken: string
): Promise<void> {
  const validation = validateResolveEffect({ action_taken: actionTaken });
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  }
  await repository.markResolved(env, id, actionTaken);
}

export async function getActiveEffects(env: Env, patientId: number): Promise<repository.AdverseEffect[]> {
  return repository.getActiveEffects(env, patientId);
}

export async function getEffectStats(env: Env, clinicId: number): Promise<repository.EffectStats[]> {
  return repository.getEffectStats(env, clinicId);
}