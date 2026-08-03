import type { Env } from "../../types";
import { ObservabilityService } from "./service";

export async function collectScheduledMetrics(env: Env): Promise<void> {
  const service = new ObservabilityService(env);
  const now = new Date().toISOString();

  await service.recordMetric({
    metric_name: "requests_total",
    metric_value: 0,
    unit: "count",
    collected_at: now,
    tags: { source: "cron" },
  });

  await service.recordMetric({
    metric_name: "db_latency_avg",
    metric_value: 0,
    unit: "ms",
    collected_at: now,
    tags: { source: "cron" },
  });

  await service.recordMetric({
    metric_name: "uptime",
    metric_value: 100,
    unit: "percent",
    collected_at: now,
    tags: { source: "cron" },
  });
}

export async function recordRequestMetric(env: Env, request: Request, durationMs: number, statusCode: number): Promise<void> {
  const service = new ObservabilityService(env);
  const now = new Date().toISOString();
  const url = new URL(request.url);

  await service.recordMetric({
    metric_name: "http_request_duration_ms",
    metric_value: durationMs,
    unit: "ms",
    collected_at: now,
    tags: { method: request.method, endpoint: url.pathname, status: String(statusCode) },
  });

  await service.recordMetric({
    metric_name: "http_requests_total",
    metric_value: 1,
    unit: "count",
    collected_at: now,
    tags: { method: request.method, endpoint: url.pathname, status: String(statusCode) },
  });
}
