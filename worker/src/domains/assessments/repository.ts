// ============================================
// REPOSITORY — worker/src/domains/assessments/repository.ts
// ============================================

import type { Env } from '../../types';
import { 
  calculateScore, 
  interpretScore, 
  SCALE_DEFINITIONS,
  SCALE_CUTOFFS,
  WELLBEING_SCALE_DEFINITIONS,
  WELLBEING_CUTOFFS,
  ALL_SCALE_DEFINITIONS,
  ALL_SCALE_CUTOFFS,
  type ScaleResponseInput,
  type ScaleCutoff,
  type ScaleDefinition,
  getScaleDomain,
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

// ============================================
// HELPERS (shared for clinical + wellbeing)
// ============================================

export function getAllScaleDefinition(scaleId: string): ScaleDefinition | null {
  return ALL_SCALE_DEFINITIONS[scaleId] || null;
}

export function isWellbeingScaleId(scaleId: string): boolean {
  return getScaleDomain(scaleId) === 'wellbeing';
}

// ============================================
// WELLBEING ASSESSMENTS (user-scoped, self-reported)
// ============================================

interface WellbeingAssessment {
  id: number;
  user_id: number;
  scale_id: string;
  version: string;
  domain: string;
  score: number;
  max_score: number;
  interpretation: string;
  band: string | null;
  provenance: string;
  disclaimer: string;
  administered_at: string;
  created_at: string;
  updated_at: string;
}

interface WellbeingResponseRecord {
  id: number;
  assessment_id: number;
  scale_id: string;
  item_id: string;
  question_text: string | null;
  answer_value: number;
  answer_raw: string | null;
  created_at: string;
}

// Create wellbeing assessment with scoring
export async function createWellbeingAssessmentWithScoring(
  env: Env,
  data: {
    user_id: number;
    scale_id: string;
    version: string;
    responses: ScaleResponseInput[];
    administered_at: string;
    provenance?: 'user_self_report' | 'imported' | 'system_generated';
  }
): Promise<{ 
  id: number; 
  score: number; 
  max_score: number; 
  interpretation: string;
  band: string | null;
  cutoff: ScaleCutoff | null;
}> {
  // 1. Validate scale exists in wellbeing domain
  const scaleDomain = getScaleDomain(data.scale_id);
  if (scaleDomain !== 'wellbeing') {
    throw new Error(`Scale ${data.scale_id} is not a wellbeing scale`);
  }

  // 2. Calculate score
  const { score, maxScore } = calculateScore(data.scale_id, data.responses);
  
  // 3. Interpret using wellbeing cutoffs
  const cutoff = interpretScore(data.scale_id, score);
  const interpretation = cutoff ? cutoff.label : 'Sin interpretar';
  const band = cutoff ? cutoff.severity : null;

  // 4. Insert main assessment
  const provenance = data.provenance || 'user_self_report';
  const disclaimer = 'Esta es una autoevaluación de bienestar y no constituye un diagnóstico.';
  
  const result = await env.DB.prepare(
    `INSERT INTO wellbeing_assessments 
     (user_id, scale_id, version, domain, score, max_score, interpretation, band, provenance, disclaimer, administered_at)
     VALUES (?, ?, ?, 'wellbeing', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.user_id,
    data.scale_id,
    data.version,
    score,
    maxScore,
    interpretation,
    band,
    provenance,
    disclaimer,
    data.administered_at
  ).run();

  const assessmentId = result.meta?.last_row_id as number;
  if (!assessmentId) {
    throw new Error('Failed to create wellbeing assessment');
  }

  // 5. Insert individual responses
  for (const response of data.responses) {
    await env.DB.prepare(
      `INSERT INTO wellbeing_responses (assessment_id, scale_id, item_id, answer_value)
       VALUES (?, ?, ?, ?)`
    ).bind(assessmentId, data.scale_id, response.item_id, response.value).run();
  }

  return {
    id: assessmentId,
    score,
    max_score: maxScore,
    interpretation,
    band,
    cutoff,
  };
}

// Get wellbeing assessments by user
export async function getWellbeingAssessmentsByUser(
  env: Env,
  userId: number,
  limit: number = 50
): Promise<WellbeingAssessment[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, scale_id, version, domain, score, max_score, interpretation, band, provenance, disclaimer, administered_at, created_at, updated_at
     FROM wellbeing_assessments 
     WHERE user_id = ? 
     ORDER BY administered_at DESC
     LIMIT ?`
  ).bind(userId, limit).all<WellbeingAssessment>();

  return results || [];
}

// Get wellbeing assessment by ID (user-scoped)
export async function getWellbeingAssessmentById(
  env: Env,
  assessmentId: number,
  userId: number
): Promise<WellbeingAssessment | null> {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, scale_id, version, domain, score, max_score, interpretation, band, provenance, disclaimer, administered_at, created_at, updated_at
     FROM wellbeing_assessments 
     WHERE id = ? AND user_id = ?`
  ).bind(assessmentId, userId).all<WellbeingAssessment>();

  return results?.[0] || null;
}

// Get wellbeing responses for assessment
export async function getWellbeingResponses(
  env: Env,
  assessmentId: number,
  userId: number
): Promise<WellbeingResponseRecord[]> {
  // Verify ownership first
  const assessment = await getWellbeingAssessmentById(env, assessmentId, userId);
  if (!assessment) {
    return [];
  }

  const { results } = await env.DB.prepare(
    `SELECT id, assessment_id, scale_id, item_id, question_text, answer_value, answer_raw, created_at
     FROM wellbeing_responses 
     WHERE assessment_id = ?`
  ).bind(assessmentId).all<WellbeingResponseRecord>();

  return results || [];
}

// Get available wellbeing scales
export function getAvailableWellbeingScales(): Array<ScaleDefinition & { cutoffs: ScaleCutoff[] }> {
  return Object.values(WELLBEING_SCALE_DEFINITIONS).map(scale => ({
    ...scale,
    cutoffs: WELLBEING_CUTOFFS[scale.id] || [],
  }));
}

// Get cutoffs for wellbeing scale
export function getWellbeingCutoffsForScale(scaleId: string): ScaleCutoff[] {
  return WELLBEING_CUTOFFS[scaleId] || [];
}
