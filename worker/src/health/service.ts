import type { Env } from '../types';
import type { HealthCheckResult, HealthSummary } from './types';

const VERSION = '1.0.0';

function ok(name: string, latencyMs?: number, message?: string, details?: Record<string, unknown>): HealthCheckResult {
  return { name, status: 'ok', latencyMs, message, details };
}

function warning(name: string, message: string, details?: Record<string, unknown>): HealthCheckResult {
  return { name, status: 'warning', message, details };
}

function error(name: string, message: string, details?: Record<string, unknown>): HealthCheckResult {
  return { name, status: 'error', message, details };
}

export class HealthService {
  private startTime = Date.now();

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getVersion(): string {
    return VERSION;
  }

  async checkDatabase(env: { DB: D1Database }): Promise<HealthCheckResult> {
    const t0 = Date.now();
    try {
      await env.DB.prepare('SELECT 1').first();
      return ok('database', Date.now() - t0, 'D1 connected');
    } catch {
      return error('database', 'D1 connection failed');
    }
  }

  async checkComplianceRules(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare('SELECT COUNT(*) as cnt FROM compliance_rules').first<{ cnt: number }>();
      const count = result?.cnt || 0;
      const active = count > 0 ? 'ok' : 'warning';
      return {
        name: 'compliance_rules',
        status: active as HealthCheckResult['status'],
        details: { total: count, active: count },
        message: `${count} reglas cargadas`,
      };
    } catch {
      return error('compliance_rules', 'No se pudo consultar compliance_rules');
    }
  }

  async checkComplianceAlerts(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare("SELECT COUNT(*) as cnt FROM compliance_alerts WHERE status = 'OPEN'").first<{ cnt: number }>();
      return ok('compliance_alerts', undefined, `${result?.cnt || 0} alertas abiertas`);
    } catch {
      return error('compliance_alerts', 'No se pudo consultar alertas');
    }
  }

  async checkComplianceRuns(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare("SELECT created_at FROM compliance_runs ORDER BY id DESC LIMIT 1").first<{ created_at: string }>();
      const lastRun = result?.created_at || null;
      if (!lastRun) return warning('compliance_cron', 'No se ha ejecutado cron de compliance');
      return ok('compliance_cron', undefined, `Última ejecución: ${lastRun}`);
    } catch {
      return error('compliance_cron', 'No se pudo consultar compliance_runs');
    }
  }

  async checkClinicalRecords(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare('SELECT COUNT(*) as cnt FROM clinical_records').first<{ cnt: number }>();
      return ok('clinical_records', undefined, `${result?.cnt || 0} registros`);
    } catch {
      return error('clinical_records', 'No se pudo consultar clinical_records');
    }
  }

  async checkSessionNotes(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare('SELECT COUNT(*) as cnt FROM session_notes').first<{ cnt: number }>();
      return ok('session_notes', undefined, `${result?.cnt || 0} notas`);
    } catch {
      return error('session_notes', 'No se pudo consultar session_notes');
    }
  }

  async checkConsents(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare('SELECT COUNT(*) as cnt FROM consents').first<{ cnt: number }>();
      return ok('consents', undefined, `${result?.cnt || 0} consentimientos`);
    } catch {
      return error('consents', 'No se pudo consultar consents');
    }
  }

  async checkDocuments(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare("SELECT COUNT(*) as cnt FROM documents WHERE status = 'SIGNED'").first<{ cnt: number }>();
      return ok('documents', undefined, `${result?.cnt || 0} documentos firmados`);
    } catch {
      return error('documents', 'No se pudo consultar documents');
    }
  }

  async checkBackups(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare("SELECT created_at FROM backup_runs WHERE status = 'completed' ORDER BY id DESC LIMIT 1").first<{ created_at: string }>();
      const lastBackup = result?.created_at || null;
      if (!lastBackup) return warning('backups', 'No se ha ejecutado backup aún');
      return ok('backups', undefined, `Último backup: ${lastBackup}`);
    } catch {
      return error('backups', 'No se pudo consultar backup_runs');
    }
  }

  async checkRestores(env: { DB: D1Database }): Promise<HealthCheckResult> {
    try {
      const result = await env.DB.prepare("SELECT status FROM restore_attempts ORDER BY id DESC LIMIT 1").first<{ status: string }>();
      const lastRestore = result?.status || null;
      if (!lastRestore) return warning('restores', 'No se ha ejecutado restauración aún');
      return ok('restores', undefined, `Última restauración: ${lastRestore}`);
    } catch {
      return error('restores', 'No se pudo consultar restore_attempts');
    }
  }

  async checkDisasterRecoveryReadiness(env: Env): Promise<HealthCheckResult> {
    const issues: string[] = [];
    if (!env.BACKUPS_BUCKET) issues.push('R2 no configurado — backups en modo metadata-only');
    try {
      const backupResult = await env.DB.prepare("SELECT COUNT(*) as cnt FROM backup_runs WHERE status = 'completed'").first<{ cnt: number }>();
      const backupCount = backupResult?.cnt || 0;
      if (backupCount === 0) issues.push('No hay backups completos');
      if (issues.length > 0) return warning('disaster_recovery', issues.join('; '), { backups_count: backupCount, r2_configured: !!env.BACKUPS_BUCKET });
      return ok('disaster_recovery', undefined, `DR listo: ${backupCount} backup(s) disponible(s), R2 configurado`);
    } catch {
      return error('disaster_recovery', 'No se pudo verificar backups');
    }
  }

  async checkR2(env: Env): Promise<HealthCheckResult> {
    if (!env.BACKUPS_BUCKET) return warning('r2', 'R2 bucket no configurado (backups en modo metadata-only)');
    return ok('r2', undefined, 'R2 bucket disponible');
  }

  async checkSecurityConfig(env: Env): Promise<HealthCheckResult> {
    const issues: string[] = [];
    if (!env.JWT_SECRET) issues.push('JWT_SECRET faltante');
    if (!env.REFRESH_SECRET) issues.push('REFRESH_SECRET faltante');
    if (!env.ALLOWED_ORIGINS) issues.push('ALLOWED_ORIGINS faltante');
    if (issues.length > 0) return warning('security', issues.join(', '));
    return ok('security', undefined, 'Configuración de seguridad completa');
  }

  async checkAll(env: Env): Promise<HealthSummary> {
    const dbCheck = await this.checkDatabase(env);
    const complianceRules = await this.checkComplianceRules(env);
    const complianceAlerts = await this.checkComplianceAlerts(env);
    const complianceRuns = await this.checkComplianceRuns(env);
    const clinicalRecords = await this.checkClinicalRecords(env);
    const sessionNotes = await this.checkSessionNotes(env);
    const consents = await this.checkConsents(env);
    const documents = await this.checkDocuments(env);
    const backups = await this.checkBackups(env);
    const restores = await this.checkRestores(env);
    const drReadiness = await this.checkDisasterRecoveryReadiness(env);
    const r2 = await this.checkR2(env);
    const security = await this.checkSecurityConfig(env);

    const checks = {
      api: ok('api'),
      database: dbCheck,
      security,
      compliance: {
        name: 'compliance',
        status: 'ok' as const,
        details: {
          rules: complianceRules.details,
          alertsOpen: complianceAlerts.details,
          lastRun: complianceRuns.details,
        },
      },
      clinical: {
        name: 'clinical',
        status: 'ok' as const,
        details: {
          records: clinicalRecords.details,
          sessionNotes: sessionNotes.details,
          consents: consents.details,
        },
      },
      documents: {
        name: 'documents',
        status: 'ok' as const,
        details: { documents: documents.details },
      },
      backups: {
        name: 'backups',
        status: backups.status,
        details: backups.details,
      },
      restores: {
        name: 'restores',
        status: restores.status,
        details: restores.details,
      },
      disaster_recovery: {
        name: 'disaster_recovery',
        status: drReadiness.status,
        details: drReadiness.details,
      },
      cloudflare: {
        name: 'cloudflare',
        status: r2.status,
        details: { d1: 'ok', r2: r2.status === 'ok' ? 'ok' : 'metadata-only' },
      },
    };

    const allStatuses = Object.values(checks).map(c => c.status);
    const overall = allStatuses.includes('error') ? 'UNHEALTHY' : allStatuses.includes('warning') ? 'DEGRADED' : 'HEALTHY';

    const systems = Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v.status.toUpperCase()]));

    return {
      overall,
      uptime: this.getUptime(),
      version: this.getVersion(),
      timestamp: new Date().toISOString(),
      systems,
      checks,
    };
  }
}
