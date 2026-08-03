export type BackupStatus = "running" | "completed" | "failed" | "verifying";

export interface BackupRun {
  id: number;
  clinic_id: number;
  started_at: string;
  completed_at: string | null;
  status: BackupStatus;
  storage_key: string | null;
  sha256: string | null;
  size_bytes: number;
  duration_ms: number;
  verified: number;
  error_message: string | null;
  created_at: string;
}

export interface BackupRunInput {
  clinic_id?: number;
  started_at?: string;
}
