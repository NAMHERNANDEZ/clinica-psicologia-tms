export type PerformanceCategory = "api" | "database" | "cache" | "worker" | "compliance" | "backup" | "auth";

export interface PerformanceMetric {
  id?: number;
  timestamp: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  category: PerformanceCategory;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SlowQuery {
  id?: number;
  timestamp: string;
  query_text: string;
  duration_ms: number;
  rows_examined?: number;
  rows_returned?: number;
  index_used?: string;
  table_names?: string;
  endpoint?: string;
  method?: string;
  request_id?: string;
  user_id?: number;
  clinic_id?: number;
  is_anomaly: number;
}

export interface QueryProfile {
  id?: number;
  query_hash: string;
  query_text: string;
  total_executions: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  min_duration_ms?: number;
  max_duration_ms?: number;
  last_executed?: string;
  tables_involved?: string;
  index_usage?: string;
  optimization_suggestions?: string;
}

export interface CacheStats {
  id?: number;
  timestamp: string;
  cache_type: string;
  key_pattern?: string;
  hits: number;
  misses: number;
  evictions: number;
  size_bytes?: number;
  ttl_seconds?: number;
}

export interface WorkerPerformance {
  id?: number;
  timestamp: string;
  worker_version?: string;
  cpu_time_ms: number;
  wall_time_ms: number;
  memory_mb: number;
  requests_per_minute: number;
  errors_per_minute: number;
  cold_starts: number;
  queue_wait_ms: number;
}

export interface PerformanceDashboard {
  timestamp: string;
  period_hours: number;
  api: {
    total_requests: number;
    avg_duration_ms: number;
    p95_duration_ms: number;
    p99_duration_ms: number;
    error_rate: number;
    slowest_endpoints: Array<{ endpoint: string; avg_ms: number; calls: number }>;
    endpoints_by_error: Array<{ endpoint: string; errors: number; total: number; rate: number }>;
  };
  database: {
    total_queries: number;
    avg_query_ms: number;
    slow_queries_24h: number;
    slowest_queries: SlowQuery[];
    query_profiles_top: QueryProfile[];
  };
  cache: {
    hit_ratio: number;
    hits: number;
    misses: number;
    by_type: Array<{ type: string; ratio: number; hits: number; misses: number }>;
  };
  worker: {
    avg_cpu_ms: number;
    avg_memory_mb: number;
    requests_per_minute: number;
    errors_per_minute: number;
    cold_starts: number;
    metrics: WorkerPerformance[];
  };
  anomalies: Array<{
    type: string;
    metric: string;
    value: number;
    threshold: number;
    severity: "WARNING" | "CRITICAL";
    message: string;
  }>;
}