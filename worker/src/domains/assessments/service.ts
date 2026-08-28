// ============================================
// SERVICE — worker/src/domains/assessments/service.ts
// ============================================

import type { Env } from '../../types';
import * as repo from './repository';
import { validateAssessmentInput, validateScaleAssessmentInput, isValidScaleId, calculateScore as calcScore, interpretScore as interpScore } from './validators';

// ============================================
// CREATE ASSESSMENT WITH SCORING
// ============================================

export async function createAssessment(
  env: Env,
  data: {
    patient_id: number;
    assessment_type: string;
    score: number;
    max_score: number;
    interpretation: string;
    administered_at: string;
    responses?: Array<{ item_id: string; value: number }>;
  },
  user: { id: number; clinic_id: number }
): Promise<{
  success: boolean;
  data?: {
    id: number;
    score: number;
    max_score: number;
    interpretation: string;
    cutoff?: {
      label: string;
      severity: string;
      color: string;
      recommendation?: string;
    };
  };
  error?: string;
  status?: number;
}> {
  
  // Si hay respuestas individuales, usar scoring automático
  if (data.responses && data.responses.length > 0) {
    const result = await repo.createAssessmentWithScoring(env, {
      clinic_id: user.clinic_id,
      patient_id: data.patient_id,
      therapist_id: user.id,
      assessment_type: data.assessment_type,
      responses: data.responses.map(r => ({
        scale_id: data.assessment_type,
        item_id: r.item_id,
        value: r.value,
      })),
      administered_at: data.administered_at,
    });

    return {
      success: true,
      data: {
        id: result.id,
        score: result.score,
        max_score: result.max_score,
        interpretation: result.interpretation,
        cutoff: result.cutoff ? {
          label: result.cutoff.label,
          severity: result.cutoff.severity,
          color: result.cutoff.color,
          recommendation: result.cutoff.recommendation,
        } : undefined,
      },
    };
  }

  // Sin respuestas: crear directamente con los valores proporcionados
  const id = await repo.createAssessment(env, {
    clinic_id: user.clinic_id,
    patient_id: data.patient_id,
    therapist_id: user.id,
    assessment_type: data.assessment_type,
    score: data.score,
    max_score: data.max_score,
    interpretation: data.interpretation,
    administered_at: data.administered_at,
  });

  return {
    success: true,
    data: {
      id,
      score: data.score,
      max_score: data.max_score,
      interpretation: data.interpretation,
    },
  };
}

// ============================================
// LIST ASSESSMENTS BY PATIENT
// ============================================

export async function listAssessmentsByPatient(
  env: Env,
  patientId: number
): Promise<{
  success: boolean;
  data?: Array<{
    id: number;
    assessment_type: string;
    score: number;
    max_score: number;
    interpretation: string;
    administered_at: string;
    created_at: string;
  }>;
  error?: string;
  status?: number;
}> {
  
  const assessments = await repo.getAssessmentsByPatient(env, patientId);

  return {
    success: true,
    data: assessments.map(a => ({
      id: a.id,
      assessment_type: a.assessment_type,
      score: a.score,
      max_score: a.max_score,
      interpretation: a.interpretation,
      administered_at: a.administered_at,
      created_at: a.created_at,
    })),
  };
}

// ============================================
// LIST ASSESSMENTS BY TYPE
// ============================================

export async function listAssessmentsByType(
  env: Env,
  patientId: number,
  assessmentType: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: number;
    assessment_type: string;
    score: number;
    max_score: number;
    interpretation: string;
    administered_at: string;
    created_at: string;
  }>;
  error?: string;
  status?: number;
}> {
  
  const assessments = await repo.getAssessmentsByType(env, patientId, assessmentType);

  return {
    success: true,
    data: assessments.map(a => ({
      id: a.id,
      assessment_type: a.assessment_type,
      score: a.score,
      max_score: a.max_score,
      interpretation: a.interpretation,
      administered_at: a.administered_at,
      created_at: a.created_at,
    })),
  };
}

// ============================================
// GET ASSESSMENT DETAIL (con respuestas)
// ============================================

export async function getAssessmentDetail(
  env: Env,
  assessmentId: number
): Promise<{
  success: boolean;
  data?: {
    assessment: {
      id: number;
      patient_id: number;
      assessment_type: string;
      score: number;
      max_score: number;
      interpretation: string;
      administered_at: string;
      created_at: string;
    };
    responses?: Array<{
      item_id: string;
      value: number;
    }>;
  };
  error?: string;
  status?: number;
}> {
  
  const assessment = await repo.getAssessmentById(env, assessmentId);
  
  if (!assessment) {
    return {
      success: false,
      error: 'Assessment no encontrado',
      status: 404,
    };
  }

  const responses = await repo.getScaleResponses(env, assessmentId);

  return {
    success: true,
    data: {
      assessment: {
        id: assessment.id,
        patient_id: assessment.patient_id,
        assessment_type: assessment.assessment_type,
        score: assessment.score,
        max_score: assessment.max_score,
        interpretation: assessment.interpretation,
        administered_at: assessment.administered_at,
        created_at: assessment.created_at,
      },
      responses: responses.map(r => ({
        item_id: r.item_id,
        value: r.value,
      })),
    },
  };
}

// ============================================
// GET AVAILABLE SCALES
// ============================================

export function getScales(
): {
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    full_name: string;
    description: string;
    condition: string;
    max_score: number;
    item_count: number;
    time_to_complete: string;
    source: string;
    cutoffs: Array<{
      min_score: number;
      max_score: number;
      severity: string;
      label: string;
      color: string;
      recommendation?: string;
    }>;
  }>;
} {
  const scales = repo.getAvailableScales();

  return {
    success: true,
    data: scales.map(s => ({
      id: s.id,
      name: s.name,
      full_name: s.full_name,
      description: s.description,
      condition: s.condition,
      max_score: s.max_score,
      item_count: s.item_count,
      time_to_complete: s.time_to_complete,
      source: s.source,
      cutoffs: s.cutoffs,
    })),
  };
}

// ============================================
// GET CUTOFFS FOR SCALE
// ============================================

export function getCutoffs(
  scaleId: string
): {
  success: boolean;
  data?: Array<{
    min_score: number;
    max_score: number;
    severity: string;
    label: string;
    color: string;
    recommendation?: string;
  }>;
  error?: string;
} {
  if (!isValidScaleId(scaleId)) {
    return {
      success: false,
      error: 'Scale ID no válido',
    };
  }

  const cutoffs = repo.getCutoffsForScale(scaleId);

  return {
    success: true,
    data: cutoffs,
  };
}

// ============================================
// CALCULATE SCORE (preview scoring sin guardar)
// ============================================

export function calculateScorePreview(
  assessmentType: string,
  responses: Array<{ item_id: string; value: number }>
): {
  success: boolean;
  data?: {
    score: number;
    max_score: number;
    interpretation: string;
    severity: string;
    color: string;
    recommendation?: string;
  };
  error?: string;
} {
  
  if (!isValidScaleId(assessmentType)) {
    return {
      success: false,
      error: 'Scale ID no válido',
    };
  }

    const result = calcScore(assessmentType, responses.map(r => ({
      scale_id: assessmentType,
      item_id: r.item_id,
      value: r.value,
    })));
  const cutoff = interpScore(assessmentType, result.score);

  return {
    success: true,
    data: {
      score: result.score,
      max_score: result.maxScore,
      interpretation: cutoff?.label || 'Sin interpretar',
      severity: cutoff?.severity || 'unknown',
      color: cutoff?.color || '#6B7280',
      recommendation: cutoff?.recommendation,
    },
  };
}
