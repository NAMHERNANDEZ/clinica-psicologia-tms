// ============================================
// ROUTES — worker/src/domains/assessments/routes.ts
// ============================================

import type { Env, User } from '../../types';
import * as service from './service';
import { validateAssessmentInput, validateScaleAssessmentInput, validatePatientId, isValidScaleId, getScaleDomain } from './validators';
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

// ============================================
// WELLBEING ROUTES (domain=wellbeing)
// ============================================

// GET /api/assessments/wellbeing/scales
export async function handleGetWellbeingScales(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = service.getWellbeingScales();
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleGetWellbeingScales error:', err);
    return json({ success: false, error: 'Error al obtener escalas de bienestar', requestId }, 500, corsHeaders);
  }
}

// GET /api/assessments/wellbeing/scales/:id/cutoffs
export async function handleGetWellbeingCutoffs(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const path = new URL(request.url).pathname;
    const segments = path.split('/');
    const cutoffsIdx = segments.indexOf('cutoffs');
    if (cutoffsIdx === -1 || cutoffsIdx === 0) {
      return json({ success: false, error: 'scale_id inválido', requestId }, 400, corsHeaders);
    }
    const scaleId = segments[cutoffsIdx - 1];
    const result = service.getWellbeingCutoffs(scaleId);
    return json({ ...result, requestId }, result.success ? 200 : 400, corsHeaders);
  } catch (err) {
    console.error('handleGetWellbeingCutoffs error:', err);
    return json({ success: false, error: 'Error al obtener cutoffs de bienestar', requestId }, 500, corsHeaders);
  }
}

// POST /api/assessments/wellbeing (crear evaluación de bienestar)
export async function handleCreateWellbeingAssessment(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json() as any;

    if (!body.scale_id || !Array.isArray(body.responses)) {
      return json({ 
        success: false, 
        error: 'scale_id y responses son requeridos',
        requestId 
      }, 400, corsHeaders);
    }

    if (!isValidScaleId(body.scale_id)) {
      return json({ 
        success: false, 
        error: `Scale ID no válido: ${body.scale_id}`,
        requestId 
      }, 400, corsHeaders);
    }

    // Verify it's a wellbeing scale
    const domain = getScaleDomain(body.scale_id);
    if (domain !== 'wellbeing') {
      return json({
        success: false,
        error: `La escala ${body.scale_id} es clínica, no de bienestar`,
        requestId
      }, 400, corsHeaders);
    }

    const result = await service.createWellbeingAssessment(env, {
      user_id: user.id,
      scale_id: body.scale_id,
      version: body.version || '1.0',
      responses: body.responses,
      administered_at: body.administered_at || new Date().toISOString(),
      provenance: body.provenance || 'user_self_report',
    });

    return json({ ...result, requestId }, result.status || 201, corsHeaders);
  } catch (err) {
    console.error('handleCreateWellbeingAssessment error:', err);
    return json({ success: false, error: 'Error al crear evaluación de bienestar', requestId }, 500, corsHeaders);
  }
}

// GET /api/assessments/wellbeing/list (listar evaluaciones del usuario)
export async function handleListWellbeingAssessments(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = await service.listUserWellbeingAssessments(env, user.id);
    return json({ ...result, requestId }, result.status || 200, corsHeaders);
  } catch (err) {
    console.error('handleListWellbeingAssessments error:', err);
    return json({ success: false, error: 'Error al listar evaluaciones de bienestar', requestId }, 500, corsHeaders);
  }
}

// GET /api/assessments/wellbeing/:id (detalle user-scoped)
export async function handleGetWellbeingAssessmentById(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const path = new URL(request.url).pathname;
    const segments = path.split('/');
    const idIdx = segments.indexOf('wellbeing');
    if (idIdx === -1 || idIdx === segments.length - 1) {
      return json({ success: false, error: 'assessment_id inválido', requestId }, 400, corsHeaders);
    }
    const assessmentId = parseInt(segments[idIdx + 1]);
    if (isNaN(assessmentId)) {
      return json({ success: false, error: 'assessment_id inválido', requestId }, 400, corsHeaders);
    }

    // Prevent /wellbeing/scales from being parsed as an ID
    if (segments[idIdx + 1] === 'scales' || segments[idIdx + 1] === 'list') {
      return json({ success: false, error: 'assessment_id inválido', requestId }, 400, corsHeaders);
    }

    const result = await service.getWellbeingAssessmentDetail(env, assessmentId, user.id);
    return json({ ...result, requestId }, result.status || 200, corsHeaders);
  } catch (err) {
    console.error('handleGetWellbeingAssessmentById error:', err);
    return json({ success: false, error: 'Error al obtener evaluación de bienestar', requestId }, 500, corsHeaders);
  }
}

// POST /api/assessments/wellbeing/preview (scoring sin guardar)
export async function handleWellbeingPreviewScore(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json() as any;
    const { scale_id, responses } = body;

    if (!scale_id || !Array.isArray(responses)) {
      return json({ 
        success: false, 
        error: 'scale_id y responses son requeridos',
        requestId 
      }, 400, corsHeaders);
    }

    // Verify it's a wellbeing scale
    const domain = getScaleDomain(scale_id);
    if (domain !== 'wellbeing') {
      return json({ 
        success: false, 
        error: `La escala ${scale_id} no es de bienestar`,
        requestId 
      }, 400, corsHeaders);
    }

    const result = service.calculateScorePreview(scale_id, responses);
    return json({ ...result, requestId }, result.success ? 200 : 400, corsHeaders);
  } catch (err) {
    console.error('handleWellbeingPreviewScore error:', err);
    return json({ success: false, error: 'Error al calcular preview de bienestar', requestId }, 500, corsHeaders);
  }
}
