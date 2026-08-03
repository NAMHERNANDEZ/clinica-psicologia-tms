export type RestoreStatus = "running" | "completed" | "failed" | "verifying";

export interface RestoreAttempt {
  id: number;
  clinic_id: number;
  backup_id: number;
  started_at: string;
  completed_at: string | null;
  status: RestoreStatus;
  restore_type: string;
  target_backup_key: string | null;
  rows_restored: number;
  tables_restored: number;
  integrity_check_passed: number;
  error_message: string | null;
  restored_by_user_id: number | null;
  created_at: string;
}

export interface RestoreAttemptInput {
  clinic_id?: number;
  backup_id?: number;
  restore_type?: string;
}