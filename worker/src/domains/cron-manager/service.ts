import type { Env } from "../../types";
import { CronManagerRepository } from "./repository";

export class CronService {
  private repo: CronManagerRepository;

  constructor(private env: Env) {
    this.repo = new CronManagerRepository(env);
  }

  async getDashboard(): Promise<{
    jobs: Array<{ id: number; name: string; schedule: string; enabled: number; status: string; last_run: string | null; next_run: string | null }>;
    recent_executions: Array<{ id: number; job_name: string; status: string; started_at: string; finished_at: string | null; duration_ms: number | null }>;
    recent_failures: number;
  }> {
    const jobsResult = await this.repo.getAllJobs();
    const executionsResult = await this.repo.getExecutions(undefined, 20);
    const failuresResult = await this.repo.getFailures(10);

    const jobs = (jobsResult.results || []).map((j: any) => ({
      id: j.id,
      name: j.name,
      schedule: j.schedule,
      enabled: j.enabled,
      status: j.status,
      last_run: j.last_run,
      next_run: j.next_run,
    }));

    const recent_executions = (executionsResult.results || []).map((e: any) => ({
      id: e.id,
      job_name: e.job_name,
      status: e.status,
      started_at: e.started_at,
      finished_at: e.finished_at,
      duration_ms: e.finished_at && e.started_at ? new Date(e.finished_at).getTime() - new Date(e.started_at).getTime() : null,
    }));

    const recent_failures = (failuresResult.results || []).filter((f: any) => !f.resolved).length;

    return { jobs, recent_executions, recent_failures };
  }

  async listJobs(enabled?: boolean): Promise<{ success: boolean; jobs?: any[]; error?: string }> {
    try {
      const result = await this.repo.getAllJobs();
      let jobs = result.results || [];
      if (enabled !== undefined) {
        jobs = jobs.filter((j: any) => j.enabled === (enabled ? 1 : 0));
      }
      return { success: true, jobs };
    } catch (err) {
      return { success: false, error: "Internal error" };
    }
  }

  async getJob(id: number): Promise<{ success: boolean; job?: any; error?: string }> {
    try {
      const job = await this.repo.getJob(id);
      if (!job) return { success: false, error: "Job not found" };
      return { success: true, job };
    } catch {
      return { success: false, error: "Internal error" };
    }
  }

  async createJob(input: { name: string; schedule: string; enabled?: number; handler: string }): Promise<{ success: boolean; job?: any; error?: string }> {
    if (!input.name || !input.schedule || !input.handler) return { success: false, error: "name, schedule and handler required" };
    try {
      const id = await this.repo.createJob(input.name, input.schedule, input.enabled ?? 1, input.handler);
      return { success: true, job: { id, name: input.name, schedule: input.schedule, enabled: input.enabled ?? 1, status: 'pending', handler: input.handler } };
    } catch {
      return { success: false, error: "Internal error" };
    }
  }

  async updateJob(id: number, input: { schedule?: string; enabled?: number; status?: string }): Promise<{ success: boolean; job?: any; error?: string }> {
    try {
      await this.repo.updateJob(id, input);
      const job = await this.repo.getJob(id);
      return { success: true, job };
    } catch {
      return { success: false, error: "Internal error" };
    }
  }

  async deleteJob(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.env.DB.prepare("DELETE FROM cron_jobs WHERE id = ?").bind(id).run();
      return { success: true };
    } catch {
      return { success: false, error: "Internal error" };
    }
  }

  async runJob(jobId: number): Promise<{ success: boolean; execution?: any; error?: string }> {
    const job = await this.repo.getJob(jobId);
    if (!job) return { success: false, error: "Job not found" };
    if (!job.enabled) return { success: false, error: "Job is disabled" };

    const executionId = await this.repo.recordExecution(jobId);
    
    try {
      // Execute the job logic based on job name
      const jobName = job.name as string;
      await this.executeJobLogic(jobName);
      await this.repo.completeExecution(executionId, 'success');
      await this.env.DB.prepare("UPDATE cron_jobs SET last_run = datetime('now') WHERE id = ?").bind(jobId).run();
      return { success: true, execution: { id: executionId, job_id: jobId, status: 'success' } };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.repo.completeExecution(executionId, 'failed', errorMsg);
      await this.repo.recordFailure(jobId, executionId, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private async executeJobLogic(jobName: string): Promise<void> {
    switch (jobName) {
      case 'compliance_full':
        // Trigger compliance evaluation for all patients
        const { executeAllRules } = await import('../../compliance/engine/rule-executor');
        const patients = await this.env.DB.prepare("SELECT id FROM patients").all();
        for (const p of patients.results || []) {
          await executeAllRules(p.id as number, this.env);
        }
        break;
      case 'backup_daily':
        const { BackupService } = await import('../backups/service');
        await new BackupService(this.env).runBackup(1);
        break;
      case 'cleanup_old_data':
        // Cleanup old metrics, logs, etc.
        await this.cleanupOldData();
        break;
      case 'health_check':
        // Already runs via cron
        break;
      default:
        console.log(`No handler for job: ${jobName}`);
    }
  }

  private async cleanupOldData(): Promise<void> {
    // Cleanup performance metrics older than 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.env.DB.prepare("DELETE FROM performance_metrics WHERE timestamp < ?").bind(cutoff).run();
    // Cleanup old slow queries
    await this.env.DB.prepare("DELETE FROM slow_queries WHERE timestamp < ?").bind(cutoff).run();
    // Cleanup old login attempts
    const loginCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.env.DB.prepare("DELETE FROM login_attempts WHERE last_attempt < ?").bind(loginCutoff).run();
  }

  async getExecutions(jobId?: number, limit = 50) {
    return this.repo.getExecutions(jobId, limit);
  }

  async getFailures(resolved?: boolean) {
    const result = await this.repo.getFailures(50);
    const results = result.results || [];
    if (resolved === undefined) return results;
    return results.filter((f: any) => f.resolved === (resolved ? 1 : 0));
  }

  async resolveFailure(failureId: number): Promise<{ success: boolean }> {
    try {
      await this.repo.resolveFailure(failureId);
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}