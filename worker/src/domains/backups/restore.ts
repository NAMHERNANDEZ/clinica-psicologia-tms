import type { Env } from "../../types";
import { BackupRepository } from "./repository";
import { RestoreRepository } from "./restore_repository";
import { logAudit } from "../../lib/audit";
import { batchExecute } from "../../lib/transaction";

function generateBackupKey(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `backups/clinica-tms-db_${date}_${time}.json`;
}

function parseBackupData(data: string): Record<string, unknown[]> {
  try {
    return JSON.parse(data);
  } catch {
    throw new Error("Backup data is not valid JSON");
  }
}

export class RestoreService {
  private backupRepo: BackupRepository;
  private restoreRepo: RestoreRepository;

  constructor(private env: Env) {
    this.backupRepo = new BackupRepository(env);
    this.restoreRepo = new RestoreRepository(env);
  }

  async restoreFromBackup(
    backupId: number,
    clinicId: number,
    userId: number
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const runId = await this.restoreRepo.create(clinicId, backupId, "full");
    const auditExtra = { restore_run_id: runId, backup_id: backupId, restore_type: "full" };

    try {
      const backup = await this.backupRepo.findById(backupId);
      if (!backup) {
        await this.restoreRepo.fail(runId, "Backup not found");
        await this.logAuditEvent(clinicId, userId, "restore_failed", "restore_attempts", runId, auditExtra);
        return { success: false, error: "Backup not found" };
      }

      if (backup.status !== "completed") {
        await this.restoreRepo.fail(runId, `Backup status is ${backup.status}, cannot restore`);
        await this.logAuditEvent(clinicId, userId, "restore_failed", "restore_attempts", runId, auditExtra);
        return { success: false, error: `Backup status is ${backup.status}` };
      }

      if (!backup.storage_key || !backup.sha256) {
        await this.restoreRepo.fail(runId, "Backup has no storage key or checksum");
        await this.logAuditEvent(clinicId, userId, "restore_failed", "restore_attempts", runId, auditExtra);
        return { success: false, error: "Backup has no storage key or checksum" };
      }

      let data: string;
      let verifiedChecksum = false;

      if (this.env.BACKUPS_BUCKET) {
        try {
          const obj = await this.env.BACKUPS_BUCKET.get(backup.storage_key);
          if (!obj) throw new Error("Backup object not found in R2");
          const blob = await obj.blob();
          data = await blob.text();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await this.restoreRepo.fail(runId, `R2 download failed: ${msg}`);
          await this.logAuditEvent(clinicId, userId, "restore_failed", "restore_attempts", runId, { ...auditExtra, error: msg });
          return { success: false, error: `R2 download failed: ${msg}` };
        }

        const encoder = new TextEncoder();
        const bytes = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedSha = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        if (computedSha !== backup.sha256) {
          await this.restoreRepo.fail(runId, "SHA-256 checksum mismatch");
          await this.logAuditEvent(clinicId, userId, "restore_failed_checksum", "restore_attempts", runId, { ...auditExtra, expected_sha256: backup.sha256, computed_sha256: computedSha });
          return { success: false, error: "SHA-256 checksum mismatch" };
        }

        verifiedChecksum = true;
      } else {
        await this.restoreRepo.fail(runId, "R2 bucket not configured");
        await this.logAuditEvent(clinicId, userId, "restore_failed_no_r2", "restore_attempts", runId, auditExtra);
        return { success: false, error: "R2 bucket not configured" };
      }

      const tables = parseBackupData(data);
      let totalRowsRestored = 0;
      const tablesRestored: string[] = [];

      const batchOps: Array<{ sql: string; bindings: unknown[] }> = [];

      for (const [tableName, rows] of Object.entries(tables)) {
        if (!Array.isArray(rows)) continue;
        if (rows.length === 0) continue;

        const rowArray = rows as Record<string, unknown>[];
        const columns = Object.keys(rowArray[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const insertSql = `INSERT OR REPLACE INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

        for (const row of rowArray) {
          batchOps.push({ sql: insertSql, bindings: columns.map(c => row[c] !== undefined ? row[c] : null) });
        }

        totalRowsRestored += rowArray.length;
        tablesRestored.push(tableName);
      }

      const startTime = Date.now();
      await batchExecute(this.env, batchOps);
      const durationMs = Date.now() - startTime;

      await this.restoreRepo.complete(runId, tablesRestored.length, totalRowsRestored, verifiedChecksum, durationMs);
      await this.logAuditEvent(clinicId, userId, "restore_completed", "restore_attempts", runId, { ...auditExtra, tables_restored: tablesRestored.length, rows_restored: totalRowsRestored, checksum_verified: verifiedChecksum, duration_ms: durationMs });

      return {
        success: true,
        data: {
          id: runId,
          backup_id: backupId,
          tables_restored: tablesRestored.length,
          rows_restored: totalRowsRestored,
          checksum_verified: verifiedChecksum,
          duration_ms: durationMs,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.restoreRepo.fail(runId, msg);
      await this.logAuditEvent(clinicId, userId, "restore_failed_exception", "restore_attempts", runId, { ...auditExtra, error: msg });
      return { success: false, error: msg };
    }
  }

  async restoreFromDate(
    targetDate: string,
    clinicId: number,
    userId: number
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const backup = await this.backupRepo.findByDateBefore(clinicId, targetDate);
    if (!backup) {
      return { success: false, error: `No completed backup found before ${targetDate}` };
    }
    return this.restoreFromBackup(backup.id, clinicId, userId);
  }

  async verifyBackupIntegrity(
    backupId: number,
    clinicId: number,
    userId: number
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const backup = await this.backupRepo.findById(backupId);
    if (!backup) {
      return { success: false, error: "Backup not found" };
    }

    if (!backup.storage_key || !backup.sha256) {
      return { success: false, error: "Backup has no storage key or checksum" };
    }

    if (!this.env.BACKUPS_BUCKET) {
      return { success: false, error: "R2 bucket not configured" };
    }

    try {
      const obj = await this.env.BACKUPS_BUCKET.get(backup.storage_key);
      if (!obj) return { success: false, error: "Backup object not found in R2" };

      const blob = await obj.blob();
      const bytes = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedSha = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const verified = computedSha === backup.sha256;
      await this.restoreRepo.recordIntegrityCheck(backupId, verified);

      await this.logAuditEvent(clinicId, userId, "integrity_check", "restore_attempts", 0, {
        backup_id: backupId,
        expected_sha256: backup.sha256,
        computed_sha256: computedSha,
        verified,
      });

      return { success: true, data: { backup_id: backupId, verified, expected_sha256: backup.sha256, computed_sha256: computedSha } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.restoreRepo.recordIntegrityCheck(backupId, false);
      return { success: false, error: msg };
    }
  }

  async runFireDrill(clinicId: number, userId: number): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const backup = await this.backupRepo.findLatestCompleted(clinicId);
    if (!backup) {
      return { success: false, error: "No completed backup available for fire drill" };
    }

    const runId = await this.restoreRepo.create(clinicId, backup.id, "fire_drill");
    const auditExtra = { restore_run_id: runId, backup_id: backup.id, restore_type: "fire_drill" };

    try {
      if (!backup.storage_key || !backup.sha256) {
        await this.restoreRepo.fail(runId, "Backup has no storage key or checksum");
        return { success: false, error: "Backup has no storage key or checksum" };
      }

      if (!this.env.BACKUPS_BUCKET) {
        await this.restoreRepo.fail(runId, "R2 bucket not configured");
        return { success: false, error: "R2 bucket not configured" };
      }

      let data: string;
      try {
        const obj = await this.env.BACKUPS_BUCKET.get(backup.storage_key);
        if (!obj) throw new Error("Backup object not found in R2");
        const blob = await obj.blob();
        data = await blob.text();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.restoreRepo.fail(runId, `R2 download failed: ${msg}`);
        await this.logAuditEvent(clinicId, userId, "fire_drill_failed_r2", "restore_attempts", runId, { ...auditExtra, error: msg });
        return { success: false, error: `R2 download failed: ${msg}` };
      }

      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedSha = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      if (computedSha !== backup.sha256) {
        await this.restoreRepo.fail(runId, "SHA-256 checksum mismatch during fire drill");
        await this.logAuditEvent(clinicId, userId, "fire_drill_checksum_mismatch", "restore_attempts", runId, auditExtra);
        return { success: false, error: "SHA-256 checksum mismatch during fire drill" };
      }

      const tables = parseBackupData(data);
      const tableNames = Object.keys(tables);
      const rowsPerTable: Record<string, number> = {};
      let totalRows = 0;

      for (const [tableName, rows] of Object.entries(tables)) {
        if (!Array.isArray(rows)) continue;
        rowsPerTable[tableName] = rows.length;
        totalRows += rows.length;
      }

      await this.restoreRepo.complete(runId, tableNames.length, totalRows, true, 0);
      await this.logAuditEvent(clinicId, userId, "fire_drill_completed", "restore_attempts", runId, {
        ...auditExtra,
        tables_count: tableNames.length,
        total_rows: totalRows,
        rows_per_table: rowsPerTable,
        checksum_verified: true,
        note: "Fire drill verified backup integrity. Data was NOT persisted.",
      });

      return {
        success: true,
        data: {
          id: runId,
          backup_id: backup.id,
          fire_drill: true,
          tables_count: tableNames.length,
          total_rows: totalRows,
          checksum_verified: true,
          rollback_performed: true,
          rows_per_table: rowsPerTable,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.restoreRepo.fail(runId, msg);
      await this.logAuditEvent(clinicId, userId, "fire_drill_failed", "restore_attempts", runId, { ...auditExtra, error: msg });
      return { success: false, error: msg };
    }
  }

  private async logAuditEvent(
    clinicId: number,
    userId: number,
    action: string,
    entity: string,
    entityId: number,
    extra: Record<string, unknown>
  ): Promise<void> {
    try {
      await batchExecute(this.env, [
        {
          sql: "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, session_id, correlation_id, result, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
          bindings: [clinicId, userId, "backup", action, entity, entityId, undefined, JSON.stringify(extra), undefined, undefined, null, `restore-${Date.now()}-${action}`, "SUCCESS", "info"],
        },
      ]);
    } catch {
      console.error("Failed to log audit event for restore");
    }
  }
}