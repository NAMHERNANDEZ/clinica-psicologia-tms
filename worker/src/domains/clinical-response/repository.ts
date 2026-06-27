import type { Env } from '../../types';
import type { ClinicalResponseInput } from './validators';

interface ClinicalResponseRow {
  id: number;
  clinic_id: number;
  tms_session_id: number;
  patient_id: number;
  mood_score: number;
  energy_score: number | null;
  anxiety_score: number | null;
  sleep_score: number | null;
  concentration_score: number | null;
  overall_response: number;
  notes: string | null;
  created_at: string;
}

interface ProgressCurveRow {
  session_number: number;
  mood_score: number | null;
  overall_response: number;
}

interface LatestScoresRow {
  mood_score: number | null;
  energy_score: number | null;
  anxiety_score: number | null;
  sleep_score: number | null;
  concentration_score: number | null;
}

interface AvgScoresRow {
  avg_mood: number | null;
  avg_energy: number | null;
  avg_anxiety: number | null;
  avg_sleep: number | null;
  avg_concentration: number | null;
  avg_overall: number | null;
}

function calculateOverallResponse(data: ClinicalResponseInput): number {
  const scores: number[] = [data.mood_score];
  if (data.energy_score !== undefined) scores.push(data.energy_score);
  if (data.anxiety_score !== undefined) scores.push(data.anxiety_score);
  if (data.sleep_score !== undefined) scores.push(data.sleep_score);
  if (data.concentration_score !== undefined) scores.push(data.concentration_score);
  const sum = scores.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

export async function findByPatient(env: Env, patientId: number): Promise<ClinicalResponseRow[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM clinical_response_tracking WHERE patient_id = ? ORDER BY created_at DESC'
  ).bind(patientId).all<ClinicalResponseRow>();
  return result.results;
}

export async function findBySession(env: Env, tmsSessionId: number): Promise<ClinicalResponseRow | null> {
  const result = await env.DB.prepare(
    'SELECT * FROM clinical_response_tracking WHERE tms_session_id = ?'
  ).bind(tmsSessionId).first<ClinicalResponseRow>();
  return result ?? null;
}

export async function create(env: Env, clinicId: number, data: ClinicalResponseInput): Promise<ClinicalResponseRow> {
  const overallResponse = calculateOverallResponse(data);
  const result = await env.DB.prepare(
    `INSERT INTO clinical_response_tracking 
     (clinic_id, tms_session_id, patient_id, mood_score, energy_score, anxiety_score, sleep_score, concentration_score, overall_response, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    clinicId,
    data.tms_session_id,
    0,
    data.mood_score,
    data.energy_score ?? null,
    data.anxiety_score ?? null,
    data.sleep_score ?? null,
    data.concentration_score ?? null,
    overallResponse,
    data.notes ?? null
  ).first<ClinicalResponseRow>();
  return result!;
}

export async function getProgressCurve(env: Env, patientId: number): Promise<ProgressCurveRow[]> {
  const result = await env.DB.prepare(
    `SELECT ts.session_number, crt.mood_score, crt.overall_response
     FROM clinical_response_tracking crt
     JOIN tms_sessions ts ON crt.tms_session_id = ts.id
     WHERE crt.patient_id = ?
     ORDER BY ts.session_number ASC`
  ).bind(patientId).all<ProgressCurveRow>();
  return result.results;
}

export async function getLatestScores(env: Env, patientId: number): Promise<LatestScoresRow | null> {
  const result = await env.DB.prepare(
    `SELECT mood_score, energy_score, anxiety_score, sleep_score, concentration_score
     FROM clinical_response_tracking
     WHERE patient_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(patientId).first<LatestScoresRow>();
  return result ?? null;
}

export async function getAvgScores(env: Env, patientId: number): Promise<AvgScoresRow | null> {
  const result = await env.DB.prepare(
    `SELECT 
       AVG(mood_score) as avg_mood,
       AVG(energy_score) as avg_energy,
       AVG(anxiety_score) as avg_anxiety,
       AVG(sleep_score) as avg_sleep,
       AVG(concentration_score) as avg_concentration,
       AVG(overall_response) as avg_overall
     FROM clinical_response_tracking
     WHERE patient_id = ?`
  ).bind(patientId).first<AvgScoresRow>();
  return result ?? null;
}