import type { Env, User } from '../../types';
import * as service from './service';
import { validateLeadCreate, validateLeadUpdate, validateEstado, validateNote } from './validators';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function extractId(request: Request): number {
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const id = parseInt(parts[parts.length - 1]);
  return isNaN(id) ? NaN : id;
}

function extractParentId(request: Request): number {
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const id = parseInt(parts[parts.length - 2]);
  return isNaN(id) ? NaN : id;
}

export async function handleListLeads(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const estado = url.searchParams.get('estado') || undefined;
    const origen = url.searchParams.get('origen') || undefined;
    const search = url.searchParams.get('buscar') || undefined;
    const leads = await service.listLeads(env, user.clinic_id, estado, origen, search);
    return json({ success: true, data: leads }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetLead(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = extractId(request);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid ID' }, 400, corsHeaders);
    }

    const lead = await service.getLead(env, id, user.clinic_id);
    if (!lead || lead.deleted_at) {
      return json({ success: false, error: 'Lead not found' }, 404, corsHeaders);
    }
    const [audit, notes] = await Promise.all([
      service.getLeadAudit(env, id, user.clinic_id),
      service.getLeadNotes(env, id, user.clinic_id),
    ]);
    return json({ success: true, data: { ...lead, audit, notes } }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCreateLead(env: Env, request: Request, corsHeaders: Record<string, string>, user?: User | null): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateLeadCreate(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, 400, corsHeaders);
    }

    const result = await service.createLead(env, {
      ...validation.data,
      clinic_id: validation.data?.clinic_id || user?.clinic_id || 1,
    });
    return json({ success: true, data: result }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleUpdateLead(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = extractId(request);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid ID' }, 400, corsHeaders);
    }

    const body = await request.json();
    const validation = validateLeadUpdate(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, 400, corsHeaders);
    }

    const result = await service.updateLead(env, id, user.clinic_id, validation.data as Record<string, unknown>, { id: user.id, email: user.email });
    if (!result.updated) {
      return json({ success: false, error: 'Lead not found' }, 404, corsHeaders);
    }
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleUpdateLeadEstado(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = extractParentId(request);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid ID' }, 400, corsHeaders);
    }

    const body = await request.json() as any;
    const validation = validateEstado(body.estado);
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, 400, corsHeaders);
    }

    const result = await service.updateLeadEstado(env, id, user.clinic_id, validation.estado as any, { id: user.id, email: user.email });
    if (!result.updated) {
      return json({ success: false, error: 'Lead not found' }, 404, corsHeaders);
    }
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleDeleteLead(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = extractId(request);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid ID' }, 400, corsHeaders);
    }

    const result = await service.softDeleteLead(env, id, user.clinic_id, { id: user.id, email: user.email });
    if (!result.deleted) {
      return json({ success: false, error: 'Lead not found' }, 404, corsHeaders);
    }
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleAddLeadNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = extractParentId(request);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid ID' }, 400, corsHeaders);
    }

    const body = await request.json();
    const validation = validateNote(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, 400, corsHeaders);
    }

    const result = await service.addLeadNote(env, id, user.clinic_id, validation.note!, { id: user.id, email: user.email });
    if (!result.added) {
      return json({ success: false, error: 'Lead not found' }, 404, corsHeaders);
    }
    return json({ success: true, data: result }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetLeadStats(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const stats = await service.getLeadStats(env, user.clinic_id);
    return json({ success: true, data: stats }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}