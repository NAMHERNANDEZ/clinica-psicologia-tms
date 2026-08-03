import type { Env, User } from "../../types";
import { SecurityService } from "./service";

export async function securityMiddleware(
  env: Env,
  request: Request,
  user: User | null,
  next: () => Promise<Response>
): Promise<Response> {
  const service = new SecurityService(env);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const userAgent = request.headers.get("User-Agent") || "unknown";
  const country = request.headers.get("CF-IPCountry") || undefined;
  const city = request.headers.get("CF-IPCity") || undefined;
  
  const startTime = Date.now();
  let response: Response;

  try {
    const blocked = await service.checkIPBlocked(ip);
    if (blocked) {
      await service.logSecurityEvent({
        event_type: "IP_BLOCKED",
        severity: "HIGH",
        ip,
        user_agent: userAgent,
        country,
        city,
        details: { reason: blocked.reason, path: new URL(request.url).pathname, method: request.method },
      });
      return new Response(JSON.stringify({ success: false, error: "Access denied" }), { 
        status: 403, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const anomalies = user?.id ? await service.detectAnomalies(user.id, ip, userAgent, new URL(request.url).pathname) : [];
    if (anomalies.length > 0) {
      const highSeverity = anomalies.filter(a => a.severity === "HIGH" || a.severity === "CRITICAL");
      if (highSeverity.length > 0) {
        await service.logSecurityEvent({
          event_type: "ANOMALY_DETECTED",
          severity: "HIGH",
          user_id: user?.id,
          ip,
          user_agent: userAgent,
          country,
          city,
          details: { anomalies: highSeverity.length, path: new URL(request.url).pathname, method: request.method },
        });
      }
    }

    response = await next();
  } catch (err) {
    await service.logSecurityEvent({
      event_type: "ANOMALY_DETECTED",
      severity: "HIGH",
      user_id: user?.id,
      ip,
      user_agent: userAgent,
      country,
      city,
      details: { error: err instanceof Error ? err.message : String(err), path: new URL(request.url).pathname },
    });
    throw err;
  }

  const duration = Date.now() - startTime;
  if (duration > 5000) {
    await service.logSecurityEvent({
      event_type: "ANOMALY_DETECTED",
      severity: "MEDIUM",
      user_id: user?.id,
      ip,
      user_agent: userAgent,
      country,
      city,
      details: { reason: "slow_response", duration_ms: duration, path: new URL(request.url).pathname, method: request.method },
    });
  }

  return response;
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

export function applySecurityHeaders(response: Response, customHeaders?: Record<string, string>): Response {
  const headers = getSecurityHeaders();
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) {
    newResponse.headers.set(key, value);
  }
  if (customHeaders) {
    for (const [key, value] of Object.entries(customHeaders)) {
      newResponse.headers.set(key, value);
    }
  }
  return newResponse;
}