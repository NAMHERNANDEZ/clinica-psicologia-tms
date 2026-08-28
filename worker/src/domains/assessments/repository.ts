// ============================================
// REPOSITORY — worker/src/domains/assessments/repository.ts
// ============================================

import type { Env } from '../../types';
import { 
  calculateScore, 
  interpretScore, 
  SCALE_DEFINITIONS,
  SCALE_CUTOFFS,
  type ScaleResponseInput,
  type ScaleCutoff,
} from './validators';

interface ClinicalAssessment {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number | null;
  assessment_type: string;
  score: number;
  max_score: number;
  interpretation: string;
  administered_at: string;
  created_at: string;
}

interface ScaleResponseRecord {
  id: number;
  assessment_id: number;
  scale_id: string;
  item_id: string;
  value: number;
}

// ============================================
// CREATE ASSESSMENT (con scoring automático)
// ============================================

export async function createAssessmentWithScoring(
  env: Env,
  data: {
    clinic_id: number;
    patient_id: number;
    therapist_id: number;
    assessment_type: string;
    responses: ScaleResponseInput[];
    administered_at: string;
  }
): Promise<{ 
  id: number; 
  score: number; 
  max_score: number; 
  interpretation: string;
  cutoff: ScaleCutoff | null;
}> {
  
  // 1. Calcular score
  const { score, maxScore } = calculateScore(data.assessment_type, data.responses);
  
  // 2. Interpretar según cutoffs
  const cutoff = interpretScore(data.assessment_type, score);
  const interpretation = cutoff ? cutoff.label : 'Sin interpretar';

  // 3. Insertar assessment principal
  const result = await env.DB.prepare(
    `INSERT INTO clinical_assessments (clinic_id, patient_id, therapist_id, assessment_type, score, max_score, interpretation, administered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.clinic_id,
    data.patient_id,
    data.therapist_id,
    data.assessment_type,
    score,
    maxScore,
    interpretation,
    data.administered_at
  ).run();

  const assessmentId = result.meta?.last_row_id as number;

  // 4. Insertar respuestas individuales (si la tabla existe)
  try {
    for (const response of data.responses) {
      await env.DB.prepare(
        `INSERT INTO scale_responses (assessment_id, scale_id, item_id, value)
         VALUES (?, ?, ?, ?)`
      ).bind(
        assessmentId,
        data.assessment_type,
        response.item_id,
        response.value
      ).run();
    }
  } catch (err) {
    // Si la tabla scale_responses no existe aún, continuar sin error
    console.warn('scale_responses table not available, skipping individual responses');
  }

  return {
    id: assessmentId,
    score,
    max_score: maxScore,
    interpretation,
    cutoff,
  };
}

// ============================================
// CREATE SIMPLE ASSESSMENT (sin respuestas individuales)
// ============================================

export async function createAssessment(
  env: Env,
  data: {
    clinic_id: number;
    patient_id: number;
    therapist_id: number;
    assessment_type: string;
    score: number;
    max_score: number;
    interpretation: string;
    administered_at: string;
  }
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO clinical_assessments (clinic_id, patient_id, therapist_id, assessment_type, score, max_score, interpretation, administered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.clinic_id,
    data.patient_id,
    data.therapist_id,
    data.assessment_type,
    data.score,
    data.max_score,
    data.interpretation,
    data.administered_at
  ).run();

  return result.meta?.last_row_id as number;
}

// ============================================
// LIST ASSESSMENTS BY PATIENT
// ============================================

export async function getAssessmentsByPatient(
  env: Env,
  patientId: number
): Promise<ClinicalAssessment[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, clinic_id, patient_id, therapist_id, assessment_type, score, max_score, interpretation, administered_at, created_at
     FROM clinical_assessments 
     WHERE patient_id = ? 
     ORDER BY administered_at DESC`
  ).bind(patientId).all<ClinicalAssessment>();

  return results;
}

// ============================================
// LIST ASSESSMENTS BY TYPE
// ============================================

export async function getAssessmentsByType(
  env: Env,
  patientId: number,
  assessmentType: string
): Promise<ClinicalAssessment[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, clinic_id, patient_id, therapist_id, assessment_type, score, max_score, interpretation, administered_at, created_at
     FROM clinical_assessments 
     WHERE patient_id = ? AND assessment_type = ? 
     ORDER BY administered_at DESC`
  ).bind(patientId, assessmentType).all<ClinicalAssessment>();

  return results;
}

// ============================================
// GET ASSESSMENT BY ID
// ============================================

export async function getAssessmentById(
  env: Env,
  assessmentId: number
): Promise<ClinicalAssessment | null> {
  const row = await env.DB.prepare(
    `SELECT id, clinic_id, patient_id, therapist_id, assessment_type, score, max_score, interpretation, administered_at, created_at
     FROM clinical_assessments 
     WHERE id = ?`
  ).bind(assessmentId).first<ClinicalAssessment>();

  return row ?? null;
}

// ============================================
// GET SCALE RESPONSES (individuales)
// ============================================

export async function getScaleResponses(
  env: Env,
  assessmentId: number
): Promise<ScaleResponseRecord[]> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, assessment_id, scale_id, item_id, value
       FROM scale_responses 
       WHERE assessment_id = ?`
    ).bind(assessmentId).all<ScaleResponseRecord>();

    return results;
  } catch (err) {
    // Si la tabla no existe, devolver array vacío
    return [];
  }
}

// ============================================
// GET AVAILABLE SCALES (metadata)
// ============================================

export function getAvailableScales() {
  return Object.values(SCALE_DEFINITIONS).map(scale => ({
    ...scale,
    cutoffs: SCALE_CUTOFFS[scale.id] || [],
  }));
}

// ============================================
// GET CUTOFFS FOR SCALE
// ============================================

export function getCutoffsForScale(scaleId: string): ScaleCutoff[] {
  return SCALE_CUTOFFS[scaleId] || [];
}
