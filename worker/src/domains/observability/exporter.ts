import type { ObservabilityDashboard, ObservabilityEvent, PerformanceMetric, HealthHistoryEntry } from "./models";

export function exportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function exportEventsToCSV(events: ObservabilityEvent[]): string {
  if (events.length === 0) return "timestamp,level,category,service,endpoint,method,status_code,duration_ms,request_id,user_id,clinic_id\n";

  const header = "timestamp,level,category,service,endpoint,method,status_code,duration_ms,request_id,user_id,clinic_id";
  const rows = events.map(e => [
    e.timestamp,
    e.level,
    e.category,
    e.service,
    e.endpoint || "",
    e.method || "",
    e.status_code || "",
    e.duration_ms || "",
    e.request_id || "",
    e.user_id || "",
    e.clinic_id || "",
  ].join(","));

  return [header, ...rows].join("\n");
}

export function exportMetricsToCSV(metrics: PerformanceMetric[]): string {
  if (metrics.length === 0) return "metric_name,metric_value,unit,collected_at,tags\n";

  const header = "metric_name,metric_value,unit,collected_at,tags";
  const rows = metrics.map(m => [
    m.metric_name,
    m.metric_value,
    m.unit,
    m.collected_at,
    m.tags ? JSON.stringify(m.tags) : "",
  ].join(","));

  return [header, ...rows].join("\n");
}

export function exportToPrometheus(dashboard: ObservabilityDashboard): string {
  const lines: string[] = [];

  lines.push(`# HELP clinica_requests_per_minute Requests per minute`);
  lines.push(`# TYPE clinica_requests_per_minute gauge`);
  lines.push(`clinica_requests_per_minute ${dashboard.requests_minute}`);

  lines.push(`# HELP clinica_avg_latency_ms Average latency in milliseconds`);
  lines.push(`# TYPE clinica_avg_latency_ms gauge`);
  lines.push(`clinica_avg_latency_ms ${dashboard.avg_latency}`);

  lines.push(`# HELP clinica_p95_latency_ms P95 latency in milliseconds`);
  lines.push(`# TYPE clinica_p95_latency_ms gauge`);
  lines.push(`clinica_p95_latency_ms ${dashboard.p95_latency}`);

  lines.push(`# HELP clinica_p99_latency_ms P99 latency in milliseconds`);
  lines.push(`# TYPE clinica_p99_latency_ms gauge`);
  lines.push(`clinica_p99_latency_ms ${dashboard.p99_latency}`);

  lines.push(`# HELP clinica_errors_24h Total errors in last 24 hours`);
  lines.push(`# TYPE clinica_errors_24h gauge`);
  lines.push(`clinica_errors_24h ${dashboard.errors_24h}`);

  lines.push(`# HELP clinica_slow_requests_24h Slow requests (>500ms) in last 24 hours`);
  lines.push(`# TYPE clinica_slow_requests_24h gauge`);
  lines.push(`clinica_slow_requests_24h ${dashboard.slow_requests_24h}`);

  lines.push(`# HELP clinica_db_latency_avg_ms Average D1 latency in milliseconds`);
  lines.push(`# TYPE clinica_db_latency_avg_ms gauge`);
  lines.push(`clinica_db_latency_avg_ms ${dashboard.db_latency_avg}`);

  lines.push(`# HELP clinica_compliance_runs_today Compliance runs today`);
  lines.push(`# TYPE clinica_compliance_runs_today gauge`);
  lines.push(`clinica_compliance_runs_today ${dashboard.compliance_runs_today}`);

  return lines.join("\n") + "\n";
}

export function exportHealthToCSV(entries: HealthHistoryEntry[]): string {
  if (entries.length === 0) return "subsystem,status,response_ms,checked_at\n";

  const header = "subsystem,status,response_ms,checked_at";
  const rows = entries.map(e => [
    e.subsystem,
    e.status,
    e.response_ms || "",
    e.checked_at || "",
  ].join(","));

  return [header, ...rows].join("\n");
}
