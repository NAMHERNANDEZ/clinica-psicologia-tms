// ============================================
// ROUTES — worker/src/domains/assessments/routes.ts
// ============================================

import type { Env, User } from '../../types';
import * as service from './service';
import { validateAssessmentInput, validateScaleAssessmentInput, validatePatientId, isValidScaleId } from './validators';
import { findPatientById } from '../patients/repository';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function getRequestId(): string {
  return crypto.randomUUID();
}

function getPatientIdFromUrl(request: Request): number | null {
  const path = new URL(request.url).pathname;
  const segments = path.split('/');
  // /api/assessments/patient/:id
  const patientIdx = segments.indexOf('patient');
  if (patientIdx === -1 || patientIdx === segments.length - 1) return null;
  const id = parseInt(segments[patientIdx + 1]);
  return isNaN(id) ? null : id;
}

// ============================================
// POST /api/assessments
// ============================================

export async function handleCreateAssessment(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json() as any;

    // Si tiene responses, es un scale assessment completo
    if (body.responses && Array.isArray(body.responses)) {
      const validation = validateScaleAssessmentInput(body);
      if (!validation.valid) {
        return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
      }

      if (!isValidScaleId(validation.data.scale_id)) {
        return json({ 
          success: false, 
          error: `Scale ID no válido: ${validation.data.scale_id}. Escalas disponibles: phq9, gad7, bdii, pcl5, audit, dass21`,
          requestId 
        }, 400, corsHeaders);
      }

      const result = await service.createAssessment(env, {
        patient_id: validation.data.patient_id,
        assessment_type: validation.data.scale_id,
        score: 0,
        max_score: 0,
        interpretation: '',
        administered_at: validation.data.administered_at,
        responses: validation.data.responses,
      }, user);

      return json({ ...result, requestId }, result.status || 201, corsHeaders);
    }

    // Sin responses: assessment simple
    const validation = validateAssessmentInput(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const result = await service.createAssessment(env, {
      patient_id: validation.data.patient_id,
      assessment_type: validation.data.assessment_type,
      score: validation.data.score,
      max_score: validation.data.max_score,
      interpretation: validation.data.interpretation,
      administered_at: validation.data.administered_at,
    }, user);

    return json({ ...result, requestId }, result.status || 201, corsHeaders);
  } catch (err) {
    console.error('handleCreateAssessment error:', err);
    return json({ success: false, error: 'Error al crear assessment', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/assessments/patient/:id
// ============================================

export async function handleGetAssessmentsByPatient(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const patientId = getPatientIdFromUrl(request);
    if (patientId === null) {
      return json({ success: false, error: 'patient_id inválido', requestId }, 400, corsHeaders);
    }

    const validation = validatePatientId(patientId);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    // IDOR/BOLA: el paciente debe pertenecer a la clínica del usuario autenticado.
    const patient = await findPatientById(env, user.clinic_id, patientId);
    if (!patient) {
      return json({ success: false, error: 'Paciente no encontrado', requestId }, 404, corsHeaders);
    }

    const result = await service.listAssessmentsByPatient(env, validation.data);
    return json({ ...result, requestId }, result.status || 200, corsHeaders);
  } catch (err) {
    console.error('handleGetAssessmentsByPatient error:', err);
    return json({ success: false, error: 'Error al listar assessments', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/assessments/patient/:id/:type
// ============================================

export async function handleGetAssessmentsByType(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientIdx = segments.indexOf('patient');
    if (patientIdx === -1) {
      return json({ success: false, error: 'URL inválida', requestId }, 400, corsHeaders);
    }
    const patientId = parseInt(segments[patientIdx + 1]);
    const assessmentType = segments[patientIdx + 2];

    const validation = validatePatientId(patientId);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    if (!assessmentType) {
      return json({ success: false, error: 'assessment_type requerido', requestId }, 400, corsHeaders);
    }

    // IDOR/BOLA: el paciente debe pertenecer a la clínica del usuario autenticado.
    const patient = await findPatientById(env, user.clinic_id, patientId);
    if (!patient) {
      return json({ success: false, error: 'Paciente no encontrado', requestId }, 404, corsHeaders);
    }

    const result = await service.listAssessmentsByType(env, validation.data, assessmentType);
    return json({ ...result, requestId }, result.status || 200, corsHeaders);
  } catch (err) {
    console.error('handleGetAssessmentsByType error:', err);
    return json({ success: false, error: 'Error al listar assessments por tipo', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/assessments/scales (lista de escalas disponibles)
// ============================================

export async function handleGetScales(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = service.getScales();
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleGetScales error:', err);
    return json({ success: false, error: 'Error al obtener escalas', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/assessments/scales/:id/cutoffs
// ============================================

export async function handleGetCutoffs(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    // /api/assessments/scales/:id/cutoffs
    const scalesIdx = segments.indexOf('scales');
    if (scalesIdx === -1 || scalesIdx === segments.length - 1) {
      return json({ success: false, error: 'scale_id requerido', requestId }, 400, corsHeaders);
    }
    const scaleId = segments[scalesIdx + 1];

    const result = service.getCutoffs(scaleId);
    if (!result.success) {
      return json({ ...result, requestId }, 400, corsHeaders);
    }

    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleGetCutoffs error:', err);
    return json({ success: false, error: 'Error al obtener cutoffs', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/assessments/:id (detalle con respuestas)
// ============================================

export async function handleGetAssessmentById(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    // /api/assessments/:id
    const lastSegment = segments[segments.length - 1];
    const id = parseInt(lastSegment);

    if (isNaN(id)) {
      return json({ success: false, error: 'assessment_id inválido', requestId }, 400, corsHeaders);
    }

    const result = await service.getAssessmentDetail(env, id);
    return json({ ...result, requestId }, result.status || 200, corsHeaders);
  } catch (err) {
    console.error('handleGetAssessmentById error:', err);
    return json({ success: false, error: 'Error al obtener assessment', requestId }, 500, corsHeaders);
  }
}

// ============================================
// POST /api/assessments/preview (calcular score sin guardar)
// ============================================

export async function handlePreviewScore(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json() as any;
    const { assessment_type, responses } = body;

    if (!assessment_type || !Array.isArray(responses)) {
      return json({ 
        success: false, 
        error: 'assessment_type y responses son requeridos',
        requestId 
      }, 400, corsHeaders);
    }

    const result = service.calculateScorePreview(assessment_type, responses);
    return json({ ...result, requestId }, result.success ? 200 : 400, corsHeaders);
  } catch (err) {
    console.error('handlePreviewScore error:', err);
    return json({ success: false, error: 'Error al calcular preview', requestId }, 500, corsHeaders);
  }
}
