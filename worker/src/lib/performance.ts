import type { Env } from '../types';

export interface PerformanceEntry {
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  timestamp: string;
  requestId: string;
}

const SLOW_THRESHOLD_MS = 500;
const LOG_EVERY_N_REQUESTS = 100;
let requestCounter = 0;

export function createPerformanceMiddleware(env: Env) {
  return async function performanceMiddleware(
    request: Request,
    requestId: string,
    next: () => Promise<{ status: number; body: Response }>,
  ): Promise<{ status: number; body: Response }> {
    const t0 = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;

    const result = await next();

    const durationMs = Date.now() - t0;
    const t1 = Date.now();

    requestCounter++;

    if (durationMs >= SLOW_THRESHOLD_MS || requestCounter % LOG_EVERY_N_REQUESTS === 0) {
      const level = durationMs >= SLOW_THRESHOLD_MS ? 'warning' : 'info';
      env.DB.prepare(
        "INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, ip, request_id, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      )
        .bind(
          1,
          0,
          'performance',
          'request_latency',
          endpoint,
          null,
          JSON.stringify({ method, status: result.status }),
          JSON.stringify({ durationMs, slow: durationMs >= SLOW_THRESHOLD_MS }),
          request.headers.get('CF-Connecting-IP') || 'unknown',
          requestId,
          level,
        )
        .run();
    }

    return result;
  };
}

export function getEndpointInfo(endpoint: string, method: string): string {
  return `${method} ${endpoint}`;
}
