import type { Env } from "../../types";
import { PerformanceService } from "./service";

export function withPerformanceMonitoring(env: Env) {
  const service = new PerformanceService(env);

  return async (request: Request, handler: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;
    const requestId = request.headers.get("X-Request-ID") || `perf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let response: Response;
    let statusCode = 200;
    let error: Error | null = null;

    try {
      response = await handler();
      statusCode = response.status;
      return response;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      statusCode = 500;
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      const category = endpoint.startsWith("/api/compliance") ? "compliance" :
        endpoint.startsWith("/api/backups") ? "backup" :
        endpoint.startsWith("/api/auth") ? "auth" : "api";

      if (durationMs > 500) {
        await service.recordSlowQuery({
          query_text: `${method} ${endpoint}`,
          duration_ms: durationMs,
          endpoint,
          method,
          request_id: requestId,
        });
      }

      await service.recordMetric({
        metric_name: `http_request_duration_ms`,
        metric_value: durationMs,
        unit: "ms",
        category,
        tags: { method, endpoint, status: String(statusCode) },
      });

      await service.recordMetric({
        metric_name: `http_request_total`,
        metric_value: 1,
        unit: "count",
        category,
        tags: { method, endpoint, status: String(statusCode) },
      });

      if (error) {
        await service.recordMetric({
          metric_name: `http_request_errors_total`,
          metric_value: 1,
          unit: "count",
          category,
          tags: { method, endpoint, error: error.name },
        });
      }
    }
  };
}

export function performanceMiddleware(corsHeaders: Record<string, string>) {
  return (request: Request, handler: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;

    return handler().then((response) => {
      const durationMs = Date.now() - startTime;
      const statusCode = response.status;

      if (durationMs > 500) {
        console.log(`[PERFORMANCE] SLOW_REQUEST ${durationMs}ms ${method} ${endpoint} status=${statusCode}`);
      }

      return response;
    }).catch((err) => {
      const durationMs = Date.now() - startTime;
      console.error(`[PERFORMANCE] ERROR ${durationMs}ms ${method} ${endpoint}:`, err);
      throw err;
    });
  };
}