import type { Env, User } from '../../types';
import { validatePredictionRequest } from './validators';
import { generatePrediction, getPatientPredictions, getPredictionHistory, evaluateConfidence } from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

export async function handlePredictResponse(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as Record<string, unknown>;
    const validation = validatePredictionRequest(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', ') }, 400, corsHeaders);
    }

    const result = await generatePrediction(env, user.clinic_id, body.patient_id as number, body.session_number as number | undefined);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetPatientPredictions(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const patientId = parseInt(url.pathname.split('/').pop() ?? '0', 10);
    if (!patientId || isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient_id' }, 400, corsHeaders);
    }

    const result = await getPatientPredictions(env, patientId);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetPredictionHistory(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const patientId = parseInt(url.pathname.split('/').pop() ?? '0', 10);
    if (!patientId || isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient_id' }, 400, corsHeaders);
    }

    const result = await getPredictionHistory(env, patientId);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleEvaluateConfidence(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const patientId = parseInt(url.pathname.split('/').pop() ?? '0', 10);
    if (!patientId || isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient_id' }, 400, corsHeaders);
    }

    const result = await evaluateConfidence(env, patientId);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
