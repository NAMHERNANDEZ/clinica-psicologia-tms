import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateConsent, validateConsentSign, validateTemplate, validateTemplateUpdate, validateRevoke } from './validators';
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

function extractId(request: Request): number {
  const parts = new URL(request.url).pathname.split('/');
  // For /api/consents/3 -> ['', 'api', 'consents', '3'] -> parts[3]
  // For /api/consents/3/sign -> ['', 'api', 'consents', '3', 'sign'] -> parts[3]
  // Always position 3 for /api/consents/:id or /api/consents/:id/*
  return parseInt(parts[3] || '0');
}

export async function handleListConsents(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);
  const url = new URL(request.url);
  const patientId = parseInt(url.searchParams.get('patient_id') || '0');
  const result = await service.listConsents(env, user.clinic_id, patientId);
  return json(result, 200, corsHeaders);
}

export async function handleCreateConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);
  const body = await request.json();
  const validation = validateConsent(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createConsent(env, user.clinic_id, validation.data, ip, user.id);
  return json(result, 201, corsHeaders);
}

export async function handleGetConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);
  const id = extractId(request);
  const result = await service.getConsent(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleSignConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);
  const id = extractId(request);
  const body = await request.json();
  const validation = validateConsentSign(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.signConsent(env, user.clinic_id, id, user.id, user.email, user.role, validation.data, ip);
  return json(result, 200, corsHeaders);
}

export async function handleRevokeConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);
  const id = extractId(request);
  const body = await request.json();
  const validation = validateRevoke(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.revokeConsent(env, user.clinic_id, id, user.id, validation.data, ip);
  return json(result, 200, corsHeaders);
}

export async function handleGetSignatures(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);
  const id = extractId(request);
  const result = await service.getConsentSignatures(env, user.clinic_id, id);
  return json(result, 200, corsHeaders);
}

export async function handleGetVersions(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);
  const id = extractId(request);
  const result = await service.getConsentVersions(env, user.clinic_id, id);
  return json(result, 200, corsHeaders);
}

export async function handleListTemplates(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('active') !== 'false';
  const result = await service.listTemplates(env, user.clinic_id, activeOnly);
  return json(result, 200, corsHeaders);
}

export async function handleCreateTemplate(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);
  const body = await request.json();
  const validation = validateTemplate(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createTemplate(env, user.clinic_id, validation.data, user.id, ip);
  return json(result, 201, corsHeaders);
}

export async function handleUpdateTemplate(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);
  const id = extractId(request);
  const body = await request.json();
  const validation = validateTemplateUpdate(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.updateTemplate(env, user.clinic_id, id, validation.data, user.id, ip);
  return json(result, 200, corsHeaders);
}