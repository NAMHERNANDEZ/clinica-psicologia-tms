import type { Env } from '../types';

export interface HealthRepository {
  checkDatabase(env: { DB: D1Database }): Promise<{ ok: boolean; latencyMs: number }>;
  checkComplianceRules(env: { DB: D1Database }): Promise<{ count: number; active: number }>;
  checkComplianceAlerts(env: { DB: D1Database }): Promise<{ open: number }>;
  checkComplianceRuns(env: { DB: D1Database }): Promise<{ lastRun: string | null }>;
  checkClinicalRecords(env: { DB: D1Database }): Promise<{ ok: boolean; count: number }>;
  checkSessionNotes(env: { DB: D1Database }): Promise<{ ok: boolean; count: number }>;
  checkConsents(env: { DB: D1Database }): Promise<{ ok: boolean; count: number }>;
  checkDocuments(env: { DB: D1Database }): Promise<{ ok: boolean; count: number }>;
  checkBackups(env: { DB: D1Database }): Promise<{ lastBackup: string | null; status: string }>;
  checkR2(env: Env): Promise<{ available: boolean; bucketName: string | null }>;
  checkSecurityConfig(env: Env): Promise<{ jwtSecret: boolean; refreshSecret: boolean; allowedOrigins: boolean }>;
}
