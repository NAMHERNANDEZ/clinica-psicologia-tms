import type { Env, User } from "../../types";
import { BackupService } from "./service";
import { RestoreService } from "./restore";

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export async function handleRunBackup(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new BackupService(env);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    return json(await service.runBackup(user.clinic_id || 1, user.id), 200, cors);
  } catch (err) {
    console.error("Run backup error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleGetLatestBackup(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new BackupService(env);
    return json(await service.getLatest(user.clinic_id || 1), 200, cors);
  } catch (err) {
    console.error("Get latest backup error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleListBackups(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const service = new BackupService(env);
    return json(await service.listBackups(user.clinic_id || 1, limit), 200, cors);
  } catch (err) {
    console.error("List backups error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRestoreFromBackup(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const backupId = parseInt(url.searchParams.get("id") || "0");
    if (!backupId) return json({ success: false, error: "Missing backup id parameter" }, 400, cors);
    const service = new RestoreService(env);
    return json(await service.restoreFromBackup(backupId, user.clinic_id || 1, user.id), 200, cors);
  } catch (err) {
    console.error("Restore error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRestoreFromLatest(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new RestoreService(env);
    return json(await service.restoreFromBackup(0, user.clinic_id || 1, user.id), 200, cors);
  } catch (err) {
    console.error("Restore from latest error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRestoreByDate(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || "";
    if (!date) return json({ success: false, error: "Missing date parameter (YYYY-MM-DD)" }, 400, cors);
    const service = new RestoreService(env);
    return json(await service.restoreFromDate(date, user.clinic_id || 1, user.id), 200, cors);
  } catch (err) {
    console.error("Restore by date error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleVerifyBackup(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const backupId = parseInt(url.searchParams.get("id") || "0");
    if (!backupId) return json({ success: false, error: "Missing backup id parameter" }, 400, cors);
    const service = new RestoreService(env);
    return json(await service.verifyBackupIntegrity(backupId, user.clinic_id || 1, user.id), 200, cors);
  } catch (err) {
    console.error("Verify backup error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleFireDrill(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new RestoreService(env);
    return json(await service.runFireDrill(user.clinic_id || 1, user.id), 200, cors);
  } catch (err) {
    console.error("Fire drill error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleListRestores(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const { RestoreRepository } = await import("./restore_repository");
    const repo = new RestoreRepository(env);
    const rows = await repo.listByClinic(user.clinic_id || 1, limit);
    return json({ success: true, data: { restores: rows } }, 200, cors);
  } catch (err) {
    console.error("List restores error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}
