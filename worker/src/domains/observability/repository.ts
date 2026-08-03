import type { Env } from "../../types";
import type { ObservabilityEvent, PerformanceMetric, HealthHistoryEntry } from "./models";

export class ObservabilityRepository {
  constructor(private env: { DB: D1Database }) {}

  async saveEvent(event: ObservabilityEvent): Promise<number> {
    const metadataStr = event.metadata ? JSON.stringify(event.metadata) : null;
    const r = await this.env.DB
      .prepare("INSERT INTO observability_events (timestamp, level, category, service, endpoint, method, status_code, duration_ms, request_id, user_id, clinic_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(
        event.timestamp,
        event.level,
        event.category,
        event.service,
        event.endpoint || null,
        event.method || null,
        event.status_code || null,
        event.duration_ms || null,
        event.request_id || null,
        event.user_id || null,
        event.clinic_id || null,
        metadataStr
      )
      .run();
    return r.meta.last_row_id as number;
  }

  async saveMetric(metric: PerformanceMetric): Promise<number> {
    const tagsStr = metric.tags ? JSON.stringify(metric.tags) : null;
    const r = await this.env.DB
      .prepare("INSERT INTO performance_metrics (metric_name, metric_value, unit, collected_at, tags) VALUES (?, ?, ?, ?, ?)")
      .bind(metric.metric_name, metric.metric_value, metric.unit, metric.collected_at, tagsStr)
      .run();
    return r.meta.last_row_id as number;
  }

  async saveHealth(entry: HealthHistoryEntry): Promise<number> {
    const detailsStr = entry.details ? JSON.stringify(entry.details) : null;
    const r = await this.env.DB
      .prepare("INSERT INTO health_history (subsystem, status, response_ms, checked_at, details) VALUES (?, ?, ?, ?, ?)")
      .bind(entry.subsystem, entry.status, entry.response_ms || null, entry.checked_at || null, detailsStr)
      .run();
    return r.meta.last_row_id as number;
  }

  async getMetricsSince(metricName: string, since: string): Promise<PerformanceMetric[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM performance_metrics WHERE metric_name = ? AND collected_at >= ? ORDER BY collected_at DESC")
      .bind(metricName, since)
      .all();
    return (r.results || []) as unknown as PerformanceMetric[];
  }

  async getEventsSince(level: string, since: string, limit = 100): Promise<ObservabilityEvent[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM observability_events WHERE level = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT ?")
      .bind(level, since, limit)
      .all();
    return (r.results || []) as unknown as ObservabilityEvent[];
  }

  async getEventsByService(service: string, since: string, limit = 100): Promise<ObservabilityEvent[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM observability_events WHERE service = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT ?")
      .bind(service, since, limit)
      .all();
    return (r.results || []) as unknown as ObservabilityEvent[];
  }

  async getErrorEventsSince(since: string, limit = 100): Promise<ObservabilityEvent[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM observability_events WHERE level IN ('ERROR', 'CRITICAL') AND timestamp >= ? ORDER BY timestamp DESC LIMIT ?")
      .bind(since, limit)
      .all();
    return (r.results || []) as unknown as ObservabilityEvent[];
  }

  async getSlowEventsSince(since: string, thresholdMs = 500, limit = 100): Promise<ObservabilityEvent[]> {
    const r = await this.env.DB
      .prepare("SELECT * FROM observability_events WHERE duration_ms > ? AND timestamp >= ? ORDER BY duration_ms DESC LIMIT ?")
      .bind(thresholdMs, since, limit)
      .all();
    return (r.results || []) as unknown as ObservabilityEvent[];
  }

  async purgeOldData(daysToKeep = 90): Promise<void> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    await this.env.DB.prepare("DELETE FROM observability_events WHERE timestamp < ?").bind(cutoff).run();
    await this.env.DB.prepare("DELETE FROM performance_metrics WHERE collected_at < ?").bind(cutoff).run();
    await this.env.DB.prepare("DELETE FROM health_history WHERE checked_at < ?").bind(cutoff).run();
  }

  async purgeOldMetrics(hoursToKeep = 24): Promise<void> {
    const cutoff = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000).toISOString();
    await this.env.DB.prepare("DELETE FROM performance_metrics WHERE collected_at < ?").bind(cutoff).run();
  }

  async getEventCountByLevel(since: string): Promise<Record<string, number>> {
    const r = await this.env.DB
      .prepare("SELECT level, COUNT(*) as cnt FROM observability_events WHERE timestamp >= ? GROUP BY level")
      .bind(since)
      .all();
    const result: Record<string, number> = {};
    for (const row of (r.results || []) as { level: string; cnt: number }[]) {
      result[row.level] = row.cnt;
    }
    return result;
  }

  async getAvgLatencyByEndpoint(since: string): Promise<{ endpoint: string; method: string; avg_ms: number; count: number }[]> {
    const r = await this.env.DB
      .prepare("SELECT endpoint, method, AVG(duration_ms) as avg_ms, COUNT(*) as count FROM observability_events WHERE timestamp >= ? AND duration_ms IS NOT NULL GROUP BY endpoint, method HAVING COUNT(*) > 0 ORDER BY avg_ms DESC")
      .bind(since)
      .all();
    return (r.results || []) as unknown as { endpoint: string; method: string; avg_ms: number; count: number }[];
  }
}