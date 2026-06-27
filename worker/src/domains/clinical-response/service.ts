import type { Env } from '../../types';
import type { ClinicalResponseInput } from './validators';
import * as repository from './repository';

export async function getPatientResponses(env: Env, patientId: number) {
  return repository.findByPatient(env, patientId);
}

export async function getSessionResponse(env: Env, tmsSessionId: number) {
  return repository.findBySession(env, tmsSessionId);
}

export async function recordResponse(env: Env, clinicId: number, data: ClinicalResponseInput) {
  return repository.create(env, clinicId, data);
}

export async function getProgressCurve(env: Env, patientId: number) {
  return repository.getProgressCurve(env, patientId);
}

export async function getLatestScores(env: Env, patientId: number) {
  return repository.getLatestScores(env, patientId);
}

export async function getAvgScores(env: Env, patientId: number) {
  return repository.getAvgScores(env, patientId);
}