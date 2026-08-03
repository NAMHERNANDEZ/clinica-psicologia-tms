export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface ObservabilityEvent {
  id?: number;
  timestamp: string;
  level: LogLevel;
  category: string;
  service: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  request_id?: string;
  user_id?: number;
  clinic_id?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetric {
  id?: number;
  metric_name: string;
  metric_value: number;
  unit: string;
  collected_at: string;
  tags?: Record<string, string>;
}

export interface HealthHistoryEntry {
  id?: number;
  subsystem: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  response_ms?: number;
  checked_at?: string;
  details?: Record<string, unknown>;
}

export interface ObservabilityDashboard {
  health: string;
  requests_minute: number;
  avg_latency: number;
  p95_latency: number;
  p99_latency: number;
  errors_24h: number;
  slow_requests_24h: number;
  backup_status: string;
  compliance_runs_today: number;
  db_latency_avg: number;
  uptime: string;
  timestamp: string;
  trends: {
    latency_1h: number[];
    errors_1h: number[];
    requests_1h: number[];
  };
}