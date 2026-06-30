import type { Env, User } from '../../types';
import { validatePatientId } from './validators';
import * as service from './service';
import * as repo from './repository';

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
  const lastSegment = segments[segments.length - 1];
  const id = parseInt(lastSegment);
  return isNaN(id) ? null : id;
}

export async function handleGetPatientDashboard(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
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

    const result = await service.getPatientDashboard(env, validation.data);
    const status = (result as { status?: number }).status || 200;
    return json({ ...result, requestId }, status, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleAnalyzeResponse(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
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

    const result = await service.analyzeResponse(env, validation.data);
    const status = (result as { status?: number }).status || 200;
    return json({ ...result, requestId }, status, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleSuggestAdjustment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
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

    const result = await service.suggestAdjustment(env, validation.data);
    const status = (result as { status?: number }).status || 200;
    return json({ ...result, requestId }, status, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleGetProtocolEfficiency(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = await service.getProtocolEfficiency(env, user.clinic_id);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleGetTmsDashboard(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = await service.getTmsDashboard(env, user.clinic_id);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleCreateAssessment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json();
    const { patient_id, assessment_type, score, max_score, interpretation, administered_at } = body;

    if (!patient_id || !assessment_type || score === undefined || !administered_at) {
      return json({ success: false, error: 'Campos requeridos: patient_id, assessment_type, score, administered_at', requestId }, 400, corsHeaders);
    }

    const id = await repo.insertAssessment(env, {
      clinic_id: user.clinic_id,
      patient_id,
      therapist_id: user.id,
      assessment_type,
      score,
      max_score: max_score || 100,
      interpretation: interpretation || '',
      administered_at,
    });

    return json({ success: true, data: { id }, requestId }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleGetAssessmentsByPatient(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const patientId = getPatientIdFromUrl(request);
    if (patientId === null) {
      return json({ success: false, error: 'patient_id inválido', requestId }, 400, corsHeaders);
    }
    const assessments = await repo.getAssessmentsByPatient(env, patientId);
    return json({ success: true, data: assessments, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleGetAssessmentsByType(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const patientId = parseInt(pathSegments[pathSegments.length - 2]);
    const assessmentType = pathSegments[pathSegments.length - 1];

    if (isNaN(patientId) || !assessmentType) {
      return json({ success: false, error: 'Parámetros inválidos', requestId }, 400, corsHeaders);
    }

    const assessments = await repo.getAssessmentsByType(env, patientId, assessmentType);
    return json({ success: true, data: assessments, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}
