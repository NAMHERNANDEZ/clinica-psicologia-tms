import type { Env, User } from "../../types";
import { SecurityService } from "./service";
import { SecurityRepository } from "./repository";

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export async function handleSecurityDashboard(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new SecurityService(env);
    const dashboard = await service.getSecurityDashboard(user.clinic_id || 1);
    return json({ success: true, data: dashboard }, 200, cors);
  } catch (err) {
    console.error("Security dashboard error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleSecurityEvents(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const since = url.searchParams.get("since") || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const severity = url.searchParams.get("severity");
    const eventType = url.searchParams.get("event_type");
    
    const repo = new SecurityRepository(env);
    let events = await repo.getSecurityEvents(limit, since);
    
    if (severity) events = events.filter(e => e.severity === severity);
    if (eventType) events = events.filter(e => e.event_type === eventType);
    
    return json({ success: true, data: { events } }, 200, cors);
  } catch (err) {
    console.error("Security events error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleBlockIP(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { ip: string; reason: string; expires_hours?: number };
    if (!body.ip || !body.reason) return json({ success: false, error: "IP and reason required" }, 400, cors);
    
    const service = new SecurityService(env);
    const expiresAt = body.expires_hours ? new Date(Date.now() + body.expires_hours * 60 * 60 * 1000).toISOString() : undefined;
    await service.blockIP(body.ip, body.reason, user.id, expiresAt);
    return json({ success: true }, 200, cors);
  } catch (err) {
    console.error("Block IP error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleUnblockIP(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { ip: string };
    if (!body.ip) return json({ success: false, error: "IP required" }, 400, cors);
    
    const service = new SecurityService(env);
    await service.unblockIP(body.ip, user.id);
    return json({ success: true }, 200, cors);
  } catch (err) {
    console.error("Unblock IP error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleBlockedIPs(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const { SecurityRepository } = await import("./repository");
    const repo = new SecurityRepository(env);
    const ips = await repo.getBlockedIPs(100);
    return json({ success: true, data: { ips } }, 200, cors);
  } catch (err) {
    console.error("Blocked IPs error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleUserSessions(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const { SecurityRepository } = await import("./repository");
    const repo = new SecurityRepository(env);
    const sessions = await repo.getUserSessions(user.id);
    return json({ success: true, data: { sessions } }, 200, cors);
  } catch (err) {
    console.error("User sessions error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRevokeSession(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { session_id: number; reason?: string };
    if (!body.session_id) return json({ success: false, error: "Session ID required" }, 400, cors);
    
    const service = new SecurityService(env);
    await service.revokeSession(body.session_id, user.id, body.reason || "user_revoked");
    return json({ success: true }, 200, cors);
  } catch (err) {
    console.error("Revoke session error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRevokeAllSessions(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { reason?: string };
    const service = new SecurityService(env);
    await service.revokeAllUserSessions(user.id, user.id, body.reason || "user_revoked_all");
    return json({ success: true, data: { message: "All sessions revoked" } }, 200, cors);
  } catch (err) {
    console.error("Revoke all sessions error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleTrustDevice(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { fingerprint: string; action: "trust" | "untrust" };
    if (!body.fingerprint || !body.action) return json({ success: false, error: "Fingerprint and action required" }, 400, cors);
    
    const service = new SecurityService(env);
    if (body.action === "trust") {
      await service.trustDevice(user.id, body.fingerprint, user.id);
    } else {
      await service.revokeDeviceTrust(user.id, body.fingerprint, user.id);
    }
    return json({ success: true }, 200, cors);
  } catch (err) {
    console.error("Trust device error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRotateSecret(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { secret_name: string; new_value: string };
    if (!body.secret_name || !body.new_value) return json({ success: false, error: "Secret name and new value required" }, 400, cors);
    
    const service = new SecurityService(env);
    const success = await service.rotateSecret(body.secret_name, body.new_value, user.id);
    return json({ success }, success ? 200 : 500, cors);
  } catch (err) {
    console.error("Rotate secret error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleDocumentIntegrity(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const documentId = parseInt(url.searchParams.get("document_id") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    
    if (!documentId) return json({ success: false, error: "Document ID required" }, 400, cors);
    
    const service = new SecurityService(env);
    const history = await service.getDocumentIntegrityHistory(documentId);
    return json({ success: true, data: { history } }, 200, cors);
  } catch (err) {
    console.error("Document integrity error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleVerifyDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { document_id: number; content: string };
    if (!body.document_id || !body.content) return json({ success: false, error: "Document ID and content required" }, 400, cors);
    
    const service = new SecurityService(env);
    const encoder = new TextEncoder();
    const result = await service.verifyDocumentIntegrity(body.document_id, encoder.encode(body.content), user.id);
    return json({ success: true, data: result }, 200, cors);
  } catch (err) {
    console.error("Verify document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleScanDocument(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { document_id: number; content: string };
    if (!body.document_id || !body.content) return json({ success: false, error: "Document ID and content required" }, 400, cors);
    
    const service = new SecurityService(env);
    const encoder = new TextEncoder();
    const result = await service.scanDocumentForMalware(body.document_id, encoder.encode(body.content), user.id);
    return json({ success: true, data: result }, 200, cors);
  } catch (err) {
    console.error("Scan document error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}