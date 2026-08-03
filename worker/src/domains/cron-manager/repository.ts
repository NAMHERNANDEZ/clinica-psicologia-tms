import type { Env } from "../../types";

export class CronManagerRepository {
  constructor(private env: { DB: D1Database }) {}

  async createJob(name: string, schedule: string, enabled: number = 1, handler: string): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO cron_jobs (name, schedule, enabled, handler) VALUES (?, ?, ?, ?)")
      .bind(name, schedule, enabled, handler)
      .run();
    return r.meta.last_row_id as number;
  }

  async getJob(id: number) {
    return this.env.DB.prepare("SELECT * FROM cron_jobs WHERE id = ?").bind(id).first();
  }

  async getAllJobs() {
    return this.env.DB.prepare("SELECT * FROM cron_jobs ORDER BY created_at DESC").all();
  }

  async updateJob(id: number, updates: { schedule?: string; enabled?: number; status?: string }) {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.schedule) { fields.push("schedule = ?"); values.push(updates.schedule); }
    if (updates.enabled !== undefined) { fields.push("enabled = ?"); values.push(updates.enabled); }
    if (updates.status) { fields.push("status = ?"); values.push(updates.status); }
    if (!fields.length) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await this.env.DB.prepare(`UPDATE cron_jobs SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  }

  async recordExecution(jobId: number): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO cron_executions (job_id, started_at, status) VALUES (?, datetime('now'), 'running')")
      .bind(jobId)
      .run();
    return r.meta.last_row_id as number;
  }

  async completeExecution(executionId: number, status: 'running' | 'success' | 'failed', error?: string) {
    const updates = ["status = ?", "finished_at = datetime('now')"];
    const values: unknown[] = [status];
    if (error) { updates.push("error = ?"); values.push(error); }
    values.push(executionId);
    await this.env.DB.prepare(`UPDATE cron_executions SET ${updates.join(", ")} WHERE id = ?`).bind(...values, executionId).run();
  }

  async getExecutions(jobId?: number, limit = 50) {
    let query = "SELECT e.*, j.name as job_name FROM cron_executions e JOIN cron_jobs j ON e.job_id = j.id";
    const values: unknown[] = [];
    if (jobId) { query += " WHERE e.job_id = ?"; values.push(jobId); }
    query += " ORDER BY e.started_at DESC LIMIT ?";
    values.push(limit);
    return this.env.DB.prepare(query).bind(...values).all();
  }

  async getFailures(limit = 50) {
    return this.env.DB
      .prepare("SELECT f.*, j.name as job_name FROM cron_failures f JOIN cron_jobs j ON f.job_id = j.id ORDER BY f.created_at DESC LIMIT ?")
      .bind(limit)
      .all();
  }

  async recordFailure(jobId: number, executionId: number, error: string) {
    await this.env.DB
      .prepare("INSERT INTO cron_failures (job_id, execution_id, error, created_at) VALUES (?, ?, ?, datetime('now'))")
      .bind(jobId, executionId, error)
      .run();
  }

  async resolveFailure(failureId: number) {
    await this.env.DB
      .prepare("UPDATE cron_failures SET resolved = 1, resolved_at = datetime('now') WHERE id = ?")
      .bind(failureId)
      .run();
  }
}