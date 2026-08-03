import type { BackupRun, BackupStatus } from "./types";

export class BackupRepository {
  constructor(private env: { DB: D1Database }) {}

  async create(clinicId: number): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO backup_runs (clinic_id, status) VALUES (?, 'running')")
      .bind(clinicId)
      .run();
    return r.meta.last_row_id as number;
  }

  async findById(id: number): Promise<BackupRun | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM backup_runs WHERE id = ?")
      .bind(id)
      .first();
    return (row as unknown as BackupRun) || null;
  }

  async findLatest(clinicId: number): Promise<BackupRun | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM backup_runs WHERE clinic_id = ? ORDER BY id DESC LIMIT 1")
      .bind(clinicId)
      .first();
    return (row as unknown as BackupRun) || null;
  }

  async findLatestCompleted(clinicId: number): Promise<BackupRun | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM backup_runs WHERE clinic_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1")
      .bind(clinicId)
      .first();
    return (row as unknown as BackupRun) || null;
  }

  async findByDateBefore(clinicId: number, targetDate: string): Promise<BackupRun | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM backup_runs WHERE clinic_id = ? AND status = 'completed' AND created_at <= ? ORDER BY created_at DESC LIMIT 1")
      .bind(clinicId, targetDate)
      .first();
    return (row as unknown as BackupRun) || null;
  }

  async list(clinicId: number, limit = 20): Promise<BackupRun[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM backup_runs WHERE clinic_id = ? ORDER BY id DESC LIMIT ?")
      .bind(clinicId, limit)
      .all();
    return (r.results || []) as unknown as BackupRun[];
  }

  async complete(id: number, storageKey: string, sha256: string, sizeBytes: number, durationMs: number, verified: number): Promise<void> {
    await this.env.DB
      .prepare("UPDATE backup_runs SET status = 'completed', completed_at = datetime('now'), storage_key = ?, sha256 = ?, size_bytes = ?, duration_ms = ?, verified = ? WHERE id = ?")
      .bind(storageKey, sha256, sizeBytes, durationMs, verified, id)
      .run();
  }

  async fail(id: number, errorMessage: string): Promise<void> {
    await this.env.DB
      .prepare("UPDATE backup_runs SET status = 'failed', completed_at = datetime('now'), error_message = ? WHERE id = ?")
      .bind(errorMessage, id)
      .run();
  }
}
