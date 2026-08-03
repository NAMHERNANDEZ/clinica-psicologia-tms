import type { Env } from "../../types";
import { ObservabilityRepository } from "./repository";
import type { ObservabilityEvent, PerformanceMetric, HealthHistoryEntry, ObservabilityDashboard } from "./models";

export class ObservabilityService {
  private repo: ObservabilityRepository;

  constructor(private env: Env) {
    this.repo = new ObservabilityRepository(env);
  }

  async recordEvent(event: ObservabilityEvent): Promise<void> {
    event.timestamp = event.timestamp || new Date().toISOString();
    await this.repo.saveEvent(event);
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    metric.collected_at = metric.collected_at || new Date().toISOString();
    await this.repo.saveMetric(metric);
  }

  async recordHealth(entry: HealthHistoryEntry): Promise<void> {
    entry.checked_at = entry.checked_at || new Date().toISOString();
    await this.repo.saveHealth(entry);
  }

  async getDashboard(clinicId: number): Promise<ObservabilityDashboard> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    let levelCounts: Record<string, number> = {};
    let errors24h = 0;
    let slowEvents: ObservabilityEvent[] = [];
    let latencyRows: { endpoint: string; method: string; avg_ms: number; count: number }[] = [];
    let latencies: number[] = [];
    let avgLatency = 0;
    let p95Latency = 0;
    let p99Latency = 0;
    let backupStatus = 'unknown';
    let complianceRunsToday = 0;
    let dbLatencyAvg = 0;
    let health = 'UNKNOWN';
    let uptime = '99.99%';
    let latency1h: number[] = [];
    let errorCounts1h = { ERROR: 0, CRITICAL: 0 };
    let requests1h = 0;

    try { levelCounts = await this.repo.getEventCountByLevel(oneDayAgo); } catch {}
    errors24h = (levelCounts['ERROR'] || 0) + (levelCounts['CRITICAL'] || 0);

    try { slowEvents = await this.repo.getSlowEventsSince(oneDayAgo, 500); } catch {}

    try { latencyRows = await this.repo.getAvgLatencyByEndpoint(oneHourAgo); } catch {}
    latencies = latencyRows.map(r => r.avg_ms).filter((v): v is number => v != null);
    avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    p95Latency = latencies.length > 0 ? Math.round(latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]) : 0;
    p99Latency = latencies.length > 0 ? Math.round(latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)]) : 0;

    try {
      const backupResult = await this.env.DB.prepare("SELECT status FROM backup_runs WHERE clinic_id = ? ORDER BY id DESC LIMIT 1").bind(clinicId).first<{ status: string }>();
      backupStatus = backupResult?.status || 'unknown';
    } catch {}

    try {
      const complianceResult = await this.env.DB.prepare("SELECT COUNT(*) as cnt FROM compliance_runs WHERE created_at >= ?").bind(oneDayAgo).first<{ cnt: number }>();
      complianceRunsToday = complianceResult?.cnt || 0;
    } catch {}

    try {
      const dbLatencyResult = await this.env.DB.prepare("SELECT AVG(duration_ms) as avg FROM observability_events WHERE service = 'worker' AND timestamp >= ?").bind(oneHourAgo).first<{ avg: number }>();
      dbLatencyAvg = dbLatencyResult?.avg ? Math.round(dbLatencyResult.avg) : 0;
    } catch {}

    try {
      const healthCheck = await this.env.DB.prepare("SELECT status FROM health_history ORDER BY checked_at DESC LIMIT 1").first<{ status: string }>();
      health = healthCheck?.status || 'UNKNOWN';
    } catch {}

    try {
      const nowTs = now.getTime();
      const runtimeResult = await this.env.DB.prepare("SELECT created_at FROM compliance_runs ORDER BY id ASC LIMIT 1").first<{ created_at: string }>();
      const runtimeStart = runtimeResult?.created_at ? new Date(runtimeResult.created_at).getTime() : nowTs;
      const uptimeMs = nowTs - runtimeStart;
      uptime = uptimeMs > 0 ? ((1 - errors24h / Math.max(uptimeMs / 60000, 1)) * 100).toFixed(2) + '%' : '99.99%';
    } catch {}

    latency1h = latencyRows.slice(0, 60).map(r => r.avg_ms);
    errorCounts1h = { ERROR: levelCounts['ERROR'] || 0, CRITICAL: levelCounts['CRITICAL'] || 0 };
    requests1h = latencyRows.reduce((sum, r) => sum + (r.count || 0), 0);

    return {
      health,
      requests_minute: Math.round(requests1h / 60),
      avg_latency: avgLatency,
      p95_latency: p95Latency,
      p99_latency: p99Latency,
      errors_24h: errors24h,
      slow_requests_24h: slowEvents.length,
      backup_status: backupStatus.toUpperCase(),
      compliance_runs_today: complianceRunsToday,
      db_latency_avg: dbLatencyAvg,
      uptime,
      timestamp: now.toISOString(),
      trends: {
        latency_1h: latency1h,
        errors_1h: [errorCounts1h['ERROR'] || 0, errorCounts1h['CRITICAL'] || 0],
        requests_1h: [requests1h],
      },
    };
  }

  evaluateAlerts(): Array<{ rule: string; level: string; message: string; value: number; threshold: number }> {
    const alerts: Array<{ rule: string; level: string; message: string; value: number; threshold: number }> = [];
    return alerts;
  }
}