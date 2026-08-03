export type CronJobStatus = 'pending' | 'running' | 'success' | 'failed';

export interface CronJob {
  id?: number;
  name: string;
  schedule: string;
  enabled: number;
  handler: string;
  description?: string;
  last_run?: string;
  next_run?: string;
  status: CronJobStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CronExecution {
  id?: number;
  job_id: number;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  status: 'running' | 'success' | 'failed';
  error_message?: string;
  result?: string;
}

export interface CronFailure {
  id?: number;
  job_id: number;
  execution_id?: number;
  error_message: string;
  attempts: number;
  resolved: number;
  resolved_at?: string;
  created_at?: string;
}

export interface CronDashboard {
  total_jobs: number;
  enabled_jobs: number;
  running_jobs: number;
  failed_jobs: number;
  recent_executions: CronExecution[];
  failures: CronFailure[];
  next_scheduled: CronJob[];
}