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

function extractNoteId(request: Request): number {
  const parts = new URL(request.url).pathname.split('/');
  // /api/clinical-notes/:id/... or /api/clinical-notes/:id
  return parseInt(parts[3] || '0');
}

export async function handleGetPatientNotes(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const patientId = extractNoteId(request);
    if (!patientId) return json({ success: false, error: 'patient_id inválido' }, 400, corsHeaders);
    const result = await service.getPatientNotes(env, patientId);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleGetClinicNotes(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const result = await service.getClinicNotes(env, user.clinic_id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
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

    const result = await service.createNote(env, user.clinic_id, user.id, validation.data, request.headers.get('CF-Connecting-IP') || 'unknown');
    return json(result, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleUpdateNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const body = await request.json();
    const result = await service.updateNote(env, user.clinic_id, id, user.id, body, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleLockNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.lockNote(env, user.clinic_id, id, user.id, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleUnlockNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.unlockNote(env, user.clinic_id, id, user.id, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleSignNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    if (user.role !== 'therapist' && user.role !== 'admin') {
      return json({ success: false, error: 'Solo terapeutas pueden firmar' }, 403, corsHeaders);
    }
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.signNote(env, user.clinic_id, id, user.id, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleCosignNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    if (user.role !== 'psychiatrist' && user.role !== 'admin') {
      return json({ success: false, error: 'Solo psiquiatras pueden cofirmar' }, 403, corsHeaders);
    }
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.cosignNote(env, user.clinic_id, id, user.id, user.role, request.headers.get('CF-Connecting-IP') || 'unknown');
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleGetNoteVersions(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.getNoteVersions(env, user.clinic_id, id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleGetNoteAudit(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.getNoteAudit(env, user.clinic_id, id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleGetNoteTemplates(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:read');
  if (err) return applyCors(err, corsHeaders);

  try {
    const result = await service.getNoteTemplates(env, user.clinic_id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}

export async function handleDeleteNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical_notes:delete');
  if (err) return applyCors(err, corsHeaders);

  try {
    const id = extractNoteId(request);
    if (!id) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);
    const result = await service.deleteNote(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err, (err as Error).stack);
    return json({ success: false, error: 'Internal error', debug: String(err) }, 500, corsHeaders);
  }
}
