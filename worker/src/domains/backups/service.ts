import type { Env } from "../../types";
import { BackupRepository } from "./repository";
import { logAudit } from "../../lib/audit";
import { batchExecute } from "../../lib/transaction";

function generateBackupKey(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `backups/clinica-tms-db_${date}_${time}.json`;
}

async function exportDatabase(env: Env): Promise<{ data: string; sha256: string; sizeBytes: number }> {
  const tables = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf%' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all<{ name: string }>();

  const dump: Record<string, unknown[]> = {};

  for (const t of tables.results || []) {
    const rows = await env.DB.prepare(`SELECT * FROM "${t.name}"`).all();
    dump[t.name] = rows.results || [];
  }

  const json = JSON.stringify(dump);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return { data: json, sha256, sizeBytes: bytes.length };
}

async function storeInR2(env: Env, storageKey: string, data: string): Promise<boolean> {
  if (!env.BACKUPS_BUCKET) return false;
  try {
    await env.BACKUPS_BUCKET.put(storageKey, data);
    return true;
  } catch {
    return false;
  }
}

async function verifyR2(env: Env, storageKey: string, sha256: string): Promise<boolean> {
  if (!env.BACKUPS_BUCKET) return false;
  try {
    const obj = await env.BACKUPS_BUCKET.get(storageKey);
    if (!obj) return false;
    const blob = await obj.blob();
    const bytes = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computed = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return computed === sha256;
  } catch {
    return false;
  }
}

export class BackupService {
  private repo: BackupRepository;

  constructor(private env: Env) {
    this.repo = new BackupRepository(env);
  }

  async runBackup(clinicId: number, userId?: number): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const startTime = Date.now();
    const runId = await this.repo.create(clinicId);

    try {
      console.log(`[Backup ${runId}] Starting database export...`);
      const { data, sha256, sizeBytes } = await exportDatabase(this.env);

      const storageKey = generateBackupKey();
      console.log(`[Backup ${runId}] Exported ${sizeBytes} bytes, SHA-256: ${sha256}`);

      const r2Stored = await storeInR2(this.env, storageKey, data);
      const storageLabel = r2Stored ? storageKey : "metadata-only (R2 unavailable)";

      let verified = 0;
      if (r2Stored) {
        verified = (await verifyR2(this.env, storageKey, sha256)) ? 1 : 0;
        console.log(`[Backup ${runId}] R2 verification: ${verified ? "OK" : "FAILED"}`);
      }

      const durationMs = Date.now() - startTime;
      await this.repo.complete(runId, storageLabel, sha256, sizeBytes, durationMs, verified);

      const auditOk = await batchExecute(this.env, [
        { sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", bindings: [clinicId, userId || 0, "backup", "backup_run", "backup_runs", runId, undefined, JSON.stringify({ storage_key: storageLabel, sha256, size_bytes: sizeBytes, duration_ms: durationMs, verified }), undefined, undefined, null, `backup-${runId}`, "SUCCESS", "info"] },
      ]);

      return {
        success: true,
        data: {
          id: runId,
          storage_key: storageLabel,
          sha256,
          size_bytes: sizeBytes,
          duration_ms: durationMs,
          verified: !!verified,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Backup ${runId}] Failed:`, msg);
      await this.repo.fail(runId, msg);

      const auditOk = await batchExecute(this.env, [
        { sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", bindings: [clinicId, userId || 0, "backup", "backup_run", "backup_runs", runId, undefined, JSON.stringify({ error: msg }), undefined, undefined, null, `backup-${runId}`, "FAILURE", "critical"] },
      ]);

      return { success: false, error: msg };
    }
  }

  async getLatest(clinicId: number) {
    const run = await this.repo.findLatestCompleted(clinicId);
    return { success: true, data: run ? { backup: run } : { backup: null } };
  }

  async listBackups(clinicId: number, limit = 20) {
    const runs = await this.repo.list(clinicId, limit);
    return { success: true, data: { backups: runs } };
  }
}
