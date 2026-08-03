import type { Env, ClinicalRecord } from '../../types';

export async function findRecords(env: Env, clinicId: number): Promise<ClinicalRecord[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, psychologist_id, reason_consultation, history, evaluation, diagnosis, treatment_plan, created_at, updated_at FROM clinical_records WHERE clinic_id = ? ORDER BY created_at DESC"
  ).bind(clinicId).all();
  return result.results as unknown as ClinicalRecord[];
}

export async function findRecordsByPatient(env: Env, clinicId: number, patientId: number): Promise<ClinicalRecord[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, psychologist_id, reason_consultation, history, evaluation, diagnosis, treatment_plan, created_at, updated_at FROM clinical_records WHERE clinic_id = ? AND patient_id = ? ORDER BY created_at DESC"
  ).bind(clinicId, patientId).all();
  return result.results as unknown as ClinicalRecord[];
}

export async function findRecordById(env: Env, clinicId: number, id: number): Promise<ClinicalRecord | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, psychologist_id, reason_consultation, history, evaluation, diagnosis, treatment_plan, created_at, updated_at FROM clinical_records WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as ClinicalRecord) || null;
}

export async function createRecord(env: Env, clinicId: number, userId: number, data: { patient_id: number; reason_consultation: string; history?: string; evaluation?: string; diagnosis?: string; treatment_plan?: string }): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO clinical_records (clinic_id, patient_id, psychologist_id, reason_consultation, history, evaluation, diagnosis, treatment_plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(clinicId, data.patient_id, userId, data.reason_consultation, data.history || null, data.evaluation || null, data.diagnosis || null, data.treatment_plan || null).run();
  return result.meta.last_row_id as number;
}

export async function updateRecord(env: Env, clinicId: number, id: number, data: Partial<ClinicalRecord>): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];
  const allowed = ['reason_consultation', 'history', 'evaluation', 'diagnosis', 'treatment_plan'];
  for (const key of allowed) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key as keyof typeof data]);
    }
  }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  values.push(id, clinicId);
  const result = await env.DB.prepare(
    `UPDATE clinical_records SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();
  return result.meta.changes > 0;
}

export async function deleteRecord(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM clinical_records WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}