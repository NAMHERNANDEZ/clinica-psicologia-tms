import type { Env } from "../../types";
import type { PerformanceMetric, SlowQuery, QueryProfile, CacheStats, WorkerPerformance, PerformanceDashboard } from "./models";

export class PerformanceRepository {
  constructor(private env: { DB: D1Database }) {}

  async saveMetric(metric: PerformanceMetric): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO performance_metrics (timestamp, metric_name, metric_value, unit, category, tags, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(
        metric.timestamp,
        metric.metric_name,
        metric.metric_value,
        metric.unit,
        metric.category,
        metric.tags ? JSON.stringify(metric.tags) : null,
        metric.metadata ? JSON.stringify(metric.metadata) : null
      )
      .run();
    return r.meta.last_row_id as number;
  }

  async getMetricsSince(category: string, since: string, limit = 1000): Promise<PerformanceMetric[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM performance_metrics WHERE category = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT ?")
      .bind(category, since, limit)
      .all();
    return (r.results || []) as unknown as PerformanceMetric[];
  }

  async saveSlowQuery(query: SlowQuery): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO slow_queries (timestamp, query_text, duration_ms, rows_examined, rows_returned, index_used, table_names, endpoint, method, request_id, user_id, clinic_id, is_anomaly) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(
        query.timestamp,
        query.query_text,
        query.duration_ms,
        query.rows_examined || null,
        query.rows_returned || null,
        query.index_used || null,
        query.table_names || null,
        query.endpoint || null,
        query.method || null,
        query.request_id || null,
        query.user_id || null,
        query.clinic_id || null,
        query.is_anomaly
      )
      .run();
    return r.meta.last_row_id as number;
  }

  async getSlowQueriesSince(since: string, limit = 100): Promise<SlowQuery[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM slow_queries WHERE timestamp >= ? ORDER BY duration_ms DESC LIMIT ?")
      .bind(since, limit)
      .all();
    return (r.results || []) as unknown as SlowQuery[];
  }

  async getSlowQueriesByEndpoint(endpoint: string, limit = 50): Promise<SlowQuery[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM slow_queries WHERE endpoint = ? ORDER BY timestamp DESC LIMIT ?")
      .bind(endpoint, limit)
      .all();
    return (r.results || []) as unknown as SlowQuery[];
  }

  async updateQueryProfile(profile: QueryProfile): Promise<void> {
    await this.env.DB
      .prepare("INSERT INTO query_profiles (query_hash, query_text, total_executions, total_duration_ms, avg_duration_ms, min_duration_ms, max_duration_ms, last_executed, tables_involved, index_usage, optimization_suggestions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(query_hash) DO UPDATE SET total_executions = total_executions + excluded.total_executions, total_duration_ms = total_duration_ms + excluded.total_duration_ms, avg_duration_ms = (total_duration_ms + excluded.total_duration_ms) / (total_executions + excluded.total_executions), min_duration_ms = MIN(min_duration_ms, excluded.min_duration_ms), max_duration_ms = MAX(max_duration_ms, excluded.max_duration_ms), last_executed = excluded.last_executed, tables_involved = COALESCE(excluded.tables_involved, tables_involved), index_usage = COALESCE(excluded.index_usage, index_usage), optimization_suggestions = COALESCE(excluded.optimization_suggestions, optimization_suggestions)")
      .bind(
        profile.query_hash,
        profile.query_text,
        profile.total_executions,
        profile.total_duration_ms,
        profile.avg_duration_ms,
        profile.min_duration_ms || null,
        profile.max_duration_ms || null,
        profile.last_executed || null,
        profile.tables_involved || null,
        profile.index_usage || null,
        profile.optimization_suggestions || null
      )
      .run();
  }

  async getQueryProfiles(limit = 50): Promise<QueryProfile[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM query_profiles ORDER BY avg_duration_ms DESC LIMIT ?")
      .bind(limit)
      .all();
    return (r.results || []) as unknown as QueryProfile[];
  }

  async saveCacheStats(stats: CacheStats): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO cache_stats (timestamp, cache_type, key_pattern, hits, misses, evictions, size_bytes, ttl_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(stats.timestamp, stats.cache_type, stats.key_pattern || null, stats.hits, stats.misses, stats.evictions, stats.size_bytes || null, stats.ttl_seconds || null)
      .run();
    return r.meta.last_row_id as number;
  }

  async getCacheStatsSince(since: string): Promise<CacheStats[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM cache_stats WHERE timestamp >= ? ORDER BY timestamp DESC")
      .bind(since)
      .all();
    return (r.results || []) as unknown as CacheStats[];
  }

  async saveWorkerPerformance(perf: WorkerPerformance): Promise<number> {
    const r = await this.env.DB
      .prepare("INSERT INTO worker_performance (timestamp, worker_version, cpu_time_ms, wall_time_ms, memory_mb, requests_per_minute, errors_per_minute, cold_starts, queue_wait_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(perf.timestamp, perf.worker_version || null, perf.cpu_time_ms, perf.wall_time_ms, perf.memory_mb, perf.requests_per_minute, perf.errors_per_minute, perf.cold_starts, perf.queue_wait_ms)
      .run();
    return r.meta.last_row_id as number;
  }

  async getWorkerPerformanceSince(since: string): Promise<WorkerPerformance[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM worker_performance WHERE timestamp >= ? ORDER BY timestamp DESC")
      .bind(since)
      .all();
    return (r.results || []) as unknown as WorkerPerformance[];
  }

  async getDashboardData(hours: number): Promise<{
    api: PerformanceDashboard['api'];
    database: PerformanceDashboard['database'];
    cache: PerformanceDashboard['cache'];
    worker: PerformanceDashboard['worker'];
    anomalies: PerformanceDashboard['anomalies'];
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const apiMetrics = await this.getMetricsSince('api', since);
    const totalRequests = apiMetrics.filter(m => m.metric_name === 'http_request_total').length;
    const durations = apiMetrics.filter(m => m.metric_name === 'http_request_duration_ms').map(m => m.metric_value);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const p95 = durations.length > 0 ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] : 0;
    const p99 = durations.length > 0 ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)] : 0;
    const errors = apiMetrics.filter(m => m.metric_name === 'http_request_errors_total').length;
    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;

    const endpointDurations = new Map<string, { sum: number; count: number }>();
    for (const m of apiMetrics.filter(m => m.metric_name === 'http_request_duration_ms')) {
      const endpoint = m.tags?.endpoint || 'unknown';
      const curr = endpointDurations.get(endpoint) || { sum: 0, count: 0 };
      curr.sum += m.metric_value;
      curr.count += 1;
      endpointDurations.set(endpoint, curr);
    }
    const slowestEndpoints = Array.from(endpointDurations.entries())
      .map(([endpoint, { sum, count }]) => ({ endpoint, avg_ms: sum / count, calls: count }))
      .sort((a, b) => b.avg_ms - a.avg_ms)
      .slice(0, 10);

    const endpointErrors = new Map<string, { errors: number; total: number }>();
    for (const m of apiMetrics) {
      const endpoint = m.tags?.endpoint || 'unknown';
      if (!endpointErrors.has(endpoint)) endpointErrors.set(endpoint, { errors: 0, total: 0 });
      const e = endpointErrors.get(endpoint)!;
      e.total += 1;
      if (m.metric_name === 'http_request_errors_total') e.errors += 1;
    }
    const endpointsByError = Array.from(endpointErrors.entries())
      .map(([endpoint, { errors, total }]) => ({ endpoint, errors, total, rate: total > 0 ? errors / total : 0 }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    const slowQueries = await this.getSlowQueriesSince(since, 20);
    const totalQueries = apiMetrics.filter(m => m.metric_name === 'db_query_total').length;
    const queryDurations = apiMetrics.filter(m => m.metric_name === 'db_query_duration_ms').map(m => m.metric_value);
    const avgQueryMs = queryDurations.length > 0 ? queryDurations.reduce((a, b) => a + b, 0) / queryDurations.length : 0;

    const queryProfiles = await this.getQueryProfiles(10);

    const cacheStats = await this.getCacheStatsSince(since);
    const hits = cacheStats.reduce((sum, s) => sum + s.hits, 0);
    const misses = cacheStats.reduce((sum, s) => sum + s.misses, 0);
    const hitRatio = (hits + misses) > 0 ? hits / (hits + misses) : 0;

    const cacheByType = new Map<string, { hits: number; misses: number }>();
    for (const s of cacheStats) {
      const curr = cacheByType.get(s.cache_type) || { hits: 0, misses: 0 };
      curr.hits += s.hits;
      curr.misses += s.misses;
      cacheByType.set(s.cache_type, curr);
    }
    const byType = Array.from(cacheByType.entries())
      .map(([type, { hits, misses }]) => ({ type, ratio: (hits + misses) > 0 ? hits / (hits + misses) : 0, hits, misses }));

    const workerPerf = await this.getWorkerPerformanceSince(since);
    const avgCpuMs = workerPerf.length > 0 ? workerPerf.reduce((sum, w) => sum + w.cpu_time_ms, 0) / workerPerf.length : 0;
    const avgMemoryMb = workerPerf.length > 0 ? workerPerf.reduce((sum, w) => sum + w.memory_mb, 0) / workerPerf.length : 0;
    const avgRpm = workerPerf.length > 0 ? workerPerf.reduce((sum, w) => sum + w.requests_per_minute, 0) / workerPerf.length : 0;
    const avgErrors = workerPerf.length > 0 ? workerPerf.reduce((sum, w) => sum + w.errors_per_minute, 0) / workerPerf.length : 0;
    const coldStarts = workerPerf.reduce((sum, w) => sum + w.cold_starts, 0);

    const anomalies: PerformanceDashboard['anomalies'] = [];
    if (avgDuration > 2000) anomalies.push({ type: 'latency', metric: 'api_avg_duration', value: avgDuration, threshold: 2000, severity: 'CRITICAL', message: `API average latency ${avgDuration.toFixed(0)}ms exceeds 2000ms threshold` });
    else if (avgDuration > 1000) anomalies.push({ type: 'latency', metric: 'api_avg_duration', value: avgDuration, threshold: 1000, severity: 'WARNING', message: `API average latency ${avgDuration.toFixed(0)}ms exceeds 1000ms threshold` });
    
    if (errorRate > 0.05) anomalies.push({ type: 'error_rate', metric: 'api_error_rate', value: errorRate * 100, threshold: 5, severity: 'CRITICAL', message: `API error rate ${(errorRate * 100).toFixed(2)}% exceeds 5% threshold` });
    else if (errorRate > 0.01) anomalies.push({ type: 'error_rate', metric: 'api_error_rate', value: errorRate * 100, threshold: 1, severity: 'WARNING', message: `API error rate ${(errorRate * 100).toFixed(2)}% exceeds 1% threshold` });

    if (avgQueryMs > 500) anomalies.push({ type: 'latency', metric: 'db_avg_query', value: avgQueryMs, threshold: 500, severity: 'CRITICAL', message: `Database average query time ${avgQueryMs.toFixed(0)}ms exceeds 500ms threshold` });
    else if (avgQueryMs > 200) anomalies.push({ type: 'latency', metric: 'db_avg_query', value: avgQueryMs, threshold: 200, severity: 'WARNING', message: `Database average query time ${avgQueryMs.toFixed(0)}ms exceeds 200ms threshold` });

    if (hitRatio < 0.5) anomalies.push({ type: 'cache', metric: 'cache_hit_ratio', value: hitRatio * 100, threshold: 50, severity: 'CRITICAL', message: `Cache hit ratio ${(hitRatio * 100).toFixed(1)}% below 50% threshold` });
    else if (hitRatio < 0.8) anomalies.push({ type: 'cache', metric: 'cache_hit_ratio', value: hitRatio * 100, threshold: 80, severity: 'WARNING', message: `Cache hit ratio ${(hitRatio * 100).toFixed(1)}% below 80% threshold` });

    if (avgMemoryMb > 512) anomalies.push({ type: 'memory', metric: 'worker_memory', value: avgMemoryMb, threshold: 512, severity: 'CRITICAL', message: `Worker memory ${avgMemoryMb.toFixed(0)}MB exceeds 512MB threshold` });
    else if (avgMemoryMb > 256) anomalies.push({ type: 'memory', metric: 'worker_memory', value: avgMemoryMb, threshold: 256, severity: 'WARNING', message: `Worker memory ${avgMemoryMb.toFixed(0)}MB exceeds 256MB threshold` });

    return {
      api: {
        total_requests: totalRequests,
        avg_duration_ms: Math.round(avgDuration),
        p95_duration_ms: Math.round(p95),
        p99_duration_ms: Math.round(p99),
        error_rate: Math.round(errorRate * 10000) / 10000,
        slowest_endpoints: slowestEndpoints,
        endpoints_by_error: endpointsByError,
      },
      database: {
        total_queries: totalQueries,
        avg_query_ms: Math.round(avgQueryMs),
        slow_queries_24h: slowQueries.filter(q => q.is_anomaly === 1).length,
        slowest_queries: slowQueries.slice(0, 20),
        query_profiles_top: queryProfiles,
      },
      cache: {
        hit_ratio: Math.round(hitRatio * 10000) / 10000,
        hits,
        misses,
        by_type: byType,
      },
      worker: {
        avg_cpu_ms: Math.round(avgCpuMs),
        avg_memory_mb: Math.round(avgMemoryMb * 100) / 100,
        requests_per_minute: Math.round(avgRpm * 100) / 100,
        errors_per_minute: Math.round(avgErrors * 100) / 100,
        cold_starts: coldStarts,
        metrics: workerPerf.slice(0, 100),
      },
      anomalies,
    };
  }
}