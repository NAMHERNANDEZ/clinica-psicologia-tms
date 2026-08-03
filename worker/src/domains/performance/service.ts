import type { Env } from "../../types";
import { PerformanceRepository } from "./repository";
import type { PerformanceMetric, SlowQuery, QueryProfile, CacheStats, WorkerPerformance, PerformanceDashboard } from "./models";

export class PerformanceService {
  private repo: PerformanceRepository;

  constructor(private env: Env) {
    this.repo = new PerformanceRepository(env);
  }

  async recordMetric(metric: Omit<PerformanceMetric, "id" | "timestamp">): Promise<void> {
    await this.repo.saveMetric({
      ...metric,
      timestamp: new Date().toISOString(),
    });
  }

  async recordSlowQuery(query: Omit<SlowQuery, "id" | "timestamp" | "is_anomaly">): Promise<void> {
    const duration = query.duration_ms;
    const isAnomaly = duration > 5000 ? 1 : 0;

    await this.repo.saveSlowQuery({
      ...query,
      timestamp: new Date().toISOString(),
      is_anomaly: isAnomaly,
    });

    const queryHash = await this.hashString(query.query_text);
    await this.repo.updateQueryProfile({
      query_hash: queryHash,
      query_text: query.query_text,
      total_executions: 1,
      total_duration_ms: query.duration_ms,
      avg_duration_ms: query.duration_ms,
      min_duration_ms: query.duration_ms,
      max_duration_ms: query.duration_ms,
      last_executed: new Date().toISOString(),
      tables_involved: query.table_names,
      index_usage: query.index_used,
    });
  }

  async recordCacheStats(stats: Omit<CacheStats, "id" | "timestamp">): Promise<void> {
    await this.repo.saveCacheStats({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }

  async recordWorkerPerformance(perf: Omit<WorkerPerformance, "id" | "timestamp">): Promise<void> {
    await this.repo.saveWorkerPerformance({
      ...perf,
      timestamp: new Date().toISOString(),
    });
  }

  async getDashboard(sinceHours = 24): Promise<PerformanceDashboard> {
    let data;
    try {
      data = await this.repo.getDashboardData(sinceHours);
    } catch (err) {
      console.error("Performance dashboard error:", err);
      data = {
        api: { total_requests: 0, avg_duration_ms: 0, p95_duration_ms: 0, p99_duration_ms: 0, error_rate: 0, slowest_endpoints: [], endpoints_by_error: [] },
        database: { total_queries: 0, avg_query_ms: 0, slow_queries_24h: 0, slowest_queries: [], query_profiles_top: [] },
        cache: { hit_ratio: 0, hits: 0, misses: 0, by_type: [] },
        worker: { avg_cpu_ms: 0, avg_memory_mb: 0, requests_per_minute: 0, errors_per_minute: 0, cold_starts: 0, metrics: [] },
        anomalies: [],
      };
    }
    return {
      timestamp: new Date().toISOString(),
      period_hours: sinceHours,
      ...data,
    };
  }

  async getSlowQueriesByEndpoint(endpoint: string, limit = 50): Promise<SlowQuery[]> {
    return this.repo.getSlowQueriesByEndpoint(endpoint, limit);
  }

  async getQueryProfiles(limit = 50): Promise<QueryProfile[]> {
    return this.repo.getQueryProfiles(limit);
  }

  async getCacheHitRatio(sinceHours = 1): Promise<number> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    const stats = await this.repo.getCacheStatsSince(since);
    if (stats.length === 0) return 1;

    const totalHits = stats.reduce((sum: number, s: CacheStats) => sum + s.hits, 0);
    const totalMisses = stats.reduce((sum: number, s: CacheStats) => sum + s.misses, 0);
    const total = totalHits + totalMisses;
    return total > 0 ? totalHits / total : 1;
  }

  async detectAnomalies(sinceHours = 1): Promise<SlowQuery[]> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    const slowQueries = await this.repo.getSlowQueriesSince(since, 1000);

    const byEndpoint = new Map<string, SlowQuery[]>();
    for (const q of slowQueries) {
      if (!q.endpoint) continue;
      const list = byEndpoint.get(q.endpoint) || [];
      list.push(q);
      byEndpoint.set(q.endpoint, list);
    }

    const anomalies: SlowQuery[] = [];
    for (const [endpoint, queries] of byEndpoint) {
      const durations = queries.map(q => q.duration_ms).sort((a, b) => a - b);
      if (durations.length < 5) continue;

      const p95 = durations[Math.floor(durations.length * 0.95)];
      const median = durations[Math.floor(durations.length * 0.5)];

      if (p95 > median * 3) {
        const slowest = queries.reduce((max, q) => q.duration_ms > max.duration_ms ? q : max, queries[0]);
        slowest.is_anomaly = 1;
        anomalies.push(slowest);
      }
    }

    return anomalies;
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  }
}