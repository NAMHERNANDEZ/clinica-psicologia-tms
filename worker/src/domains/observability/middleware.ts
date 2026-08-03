import type { Env } from "../../types";
import { ObservabilityService } from "./service";

export function withObservability(env: Env) {
  const service = new ObservabilityService(env);

  return async (request: Request, handler: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now();
    const requestId = request.headers.get("X-Request-ID") || `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = new URL(request.url);
    const method = request.method;
    const endpoint = url.pathname;

    let response: Response;
    let statusCode = 200;

    try {
      response = await handler();
      statusCode = response.status;
      return response;
    } catch (err) {
      statusCode = 500;
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      const level = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARNING" : "INFO";
      const category = endpoint.startsWith("/api/compliance") ? "compliance" : endpoint.startsWith("/api/health") ? "health" : endpoint.startsWith("/api/backups") ? "backup" : endpoint.startsWith("/api/auth") ? "auth" : "api";
      const userHeader = request.headers.get("X-User-Id");
      const clinicHeader = request.headers.get("X-Clinic-Id");

      await service.recordEvent({
        timestamp: new Date().toISOString(),
        level,
        category,
        service: "worker",
        endpoint,
        method,
        status_code: statusCode,
        duration_ms: durationMs,
        request_id: requestId,
        user_id: userHeader ? parseInt(userHeader) : undefined,
        clinic_id: clinicHeader ? parseInt(clinicHeader) : undefined,
        metadata: { user_agent: request.headers.get("User-Agent") },
      });
    }
  };
}

export function withObservabilityCors(corsHeaders: Record<string, string>) {
  return (request: Request, handler: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const endpoint = url.pathname;

    return handler().then((response) => {
      const durationMs = Date.now() - startTime;
      const level = response.status >= 500 ? "ERROR" : response.status >= 400 ? "WARNING" : "INFO";
      const category = endpoint.startsWith("/api/compliance") ? "compliance" : endpoint.startsWith("/api/health") ? "health" : endpoint.startsWith("/api/backups") ? "backup" : endpoint.startsWith("/api/auth") ? "auth" : "api";

      return response;
    }).catch((err) => {
      const durationMs = Date.now() - startTime;
      console.error(`[Observability] Request failed ${method} ${endpoint}:`, err);
      throw err;
    });
  };
}
