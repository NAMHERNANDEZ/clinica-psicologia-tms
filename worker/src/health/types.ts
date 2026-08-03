export interface HealthCheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthSummary {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptime: number;
  version: string;
  timestamp: string;
  systems: Record<string, string>;
  checks: {
    api: HealthCheckResult;
    database: HealthCheckResult;
    security: HealthCheckResult;
    compliance: HealthCheckResult;
    clinical: HealthCheckResult;
    documents: HealthCheckResult;
    backups: HealthCheckResult;
    cloudflare: HealthCheckResult;
  };
}
