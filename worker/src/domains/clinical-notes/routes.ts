import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateClinicalNote } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function applyCors(response: Response, corsHeaders: Record<string, string>): Response {
  Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function handleGetPatientNotes(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const patientId = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    if (!patientId) return json({ success: false, error: 'patient_id inválido' }, 400, corsHeaders);
    const result = await service.getPatientNotes(env, patientId);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetClinicNotes(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const result = await service.getClinicNotes(env, user.clinic_id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCreateNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    if (user.role !== 'therapist' && user.role !== 'admin') {
      return json({ success: false, error: 'Solo terapeutas pueden crear notas clínicas' }, 403, corsHeaders);
    }

    const body = await request.json();
    const validation = validateClinicalNote(body);
    if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

    const result = await service.createNote(env, user.clinic_id, user.id, validation.data);
    return json(result, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleDeleteNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:delete');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.deleteNote(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
