import type { Env, User } from "../../types";
import { DocumentService } from "./service";
import { requirePermission } from "../../middleware/require-role";

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export async function handleListDocuments(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  const permErr = requirePermission(user, 'documents:read');
  if (permErr) return permErr;
  try {
    const url = new URL(request.url);
    const patientId = parseInt(url.searchParams.get("patient_id") || "0");
    if (!patientId) return json({ success: false, error: "patient_id requerido" }, 400, cors);
    const service = new DocumentService(env);
    return json(await service.listPatientDocuments(user.clinic_id || 1, patientId), 200, cors);
  } catch (err) {
    console.error("List documents error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleGetDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  const permErr = requirePermission(user, 'documents:read');
  if (permErr) return permErr;
  try {
    const id = parseInt(request.url.split("/").pop() || "0");
    if (!id) return json({ success: false, error: "ID requerido" }, 400, cors);
    const service = new DocumentService(env);
    return json(await service.getDocument(user.clinic_id || 1, id), 200, cors);
  } catch (err) {
    console.error("Get document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleCreateDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  const permErr = requirePermission(user, 'documents:write');
  if (permErr) return permErr;
  try {
    const body = await request.json() as any;
    const service = new DocumentService(env);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    return json(await service.createDocument(user.clinic_id || 1, body, user.id, ip), 201, cors);
  } catch (err) {
    console.error("Create document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleSignDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  const permErr = requirePermission(user, 'documents:sign');
  if (permErr) return permErr;
  try {
    const parts = request.url.split("/");
    const id = parseInt(parts[parts.length - 2] || "0");
    const body = await request.json() as { signed_by: string };
    const service = new DocumentService(env);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    return json(await service.signDocument(user.clinic_id || 1, id, body.signed_by || user.email, user.id, ip), 200, cors);
  } catch (err) {
    console.error("Sign document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleArchiveDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  const permErr = requirePermission(user, 'documents:archive');
  if (permErr) return permErr;
  try {
    const parts = request.url.split("/");
    const id = parseInt(parts[parts.length - 2] || "0");
    const service = new DocumentService(env);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    return json(await service.archiveDocument(user.clinic_id || 1, id, user.id, ip), 200, cors);
  } catch (err) {
    console.error("Archive document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleSupersedeDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  const permErr = requirePermission(user, 'documents:write');
  if (permErr) return permErr;
  try {
    const parts = request.url.split("/");
    const id = parseInt(parts[parts.length - 2] || "0");
    const body = await request.json() as any;
    const service = new DocumentService(env);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    return json(await service.supersedeDocument(user.clinic_id || 1, id, body, user.id, ip), 200, cors);
  } catch (err) {
    console.error("Supersede document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}