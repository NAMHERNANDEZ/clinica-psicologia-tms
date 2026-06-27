import type { Env } from '../../types';
import * as repository from './repository';
import { validateCreateMeasurement } from './validators';

export async function getPatientMeasurements(env: Env, patientId: number): Promise<repository.MotorThreshold[]> {
  return repository.findByPatient(env, patientId);
}

export async function getLatestMeasurement(env: Env, patientId: number): Promise<repository.MotorThreshold | null> {
  return repository.findLatest(env, patientId);
}

export async function recordMeasurement(
  env: Env,
  clinicId: number,
  data: {
    patient_id: number;
    therapist_id?: number;
    mt_pct: number;
    measured_at: string;
    coil_type?: string;
    stimulation_site?: string;
    method?: string;
    notes?: string;
  }
): Promise<repository.MotorThreshold> {
  const validation = validateCreateMeasurement(data);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  }
  return repository.create(env, clinicId, data);
}

export async function deleteMeasurement(env: Env, id: number): Promise<void> {
  await repository.remove(env, id);
}

export async function getClinicMeasurements(env: Env, clinicId: number): Promise<repository.MotorThresholdWithPatient[]> {
  return repository.getByClinic(env, clinicId);
}
