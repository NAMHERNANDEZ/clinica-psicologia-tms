import type { Env } from "../../types";
import type { RestoreStatus, RestoreAttempt } from "./restore_types";

export class RestoreRepository {
  constructor(private env: { DB: D1Database }) {}

  async create(clinicId: number, backupId: number, restoreType: string): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO restore_attempts (clinic_id, backup_id, restore_type, status) VALUES (?, ?, ?, 'running')")
      .bind(clinicId, backupId, restoreType)
      .run();
    return r.meta.last_row_id as number;
  }

  async findById(id: number): Promise<RestoreAttempt | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM restore_attempts WHERE id = ?")
      .bind(id)
      .first();
    return (row as unknown as RestoreAttempt) || null;
  }

  async listByClinic(clinicId: number, limit = 20): Promise<RestoreAttempt[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM restore_attempts WHERE clinic_id = ? ORDER BY id DESC LIMIT ?")
      .bind(clinicId, limit)
      .all();
    return (r.results || []) as unknown as RestoreAttempt[];
  }

  async complete(id: number, tablesRestored: number, rowsRestored: number, integrityPassed: boolean, durationMs: number): Promise<void> {
    await this.env.DB
      .prepare("UPDATE restore_attempts SET status = 'completed', completed_at = datetime('now'), tables_restored = ?, rows_restored = ?, integrity_check_passed = ?, duration_ms = ? WHERE id = ?")
      .bind(tablesRestored, rowsRestored, integrityPassed ? 1 : 0, durationMs, id)
      .run();
  }

  async fail(id: number, errorMessage: string): Promise<void> {
    await this.env.DB
      .prepare("UPDATE restore_attempts SET status = 'failed', completed_at = datetime('now'), error_message = ? WHERE id = ?")
      .bind(errorMessage, id)
      .run();
  }

  async recordIntegrityCheck(backupId: number, passed: boolean): Promise<void> {
    await this.env.DB
      .prepare("UPDATE backup_runs SET verified = ? WHERE id = ?")
      .bind(passed ? 1 : 0, backupId)
      .run();
  }
}