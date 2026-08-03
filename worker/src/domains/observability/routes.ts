import type { Env, User } from "../../types";
import { ObservabilityRepository } from "./repository";
import { ObservabilityService } from "./service";
import { evaluateAlerts } from "./alerts";
import { exportEventsToCSV, exportMetricsToCSV, exportToPrometheus, exportHealthToCSV } from "./exporter";

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export async function handleObservabilityDashboard(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new ObservabilityService(env);
    const dashboard = await service.getDashboard(user.clinic_id || 1);
    return json({ success: true, data: dashboard }, 200, cors);
  } catch (err) {
    console.error("Observability dashboard error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleObservabilityEvents(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const level = url.searchParams.get("level") || "INFO";
    const since = url.searchParams.get("since") || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const repo = new ObservabilityRepository(env);
    const events = await repo.getEventsSince(level, since, limit);
    return json({ success: true, data: { events } }, 200, cors);
  } catch (err) {
    console.error("Observability events error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleObservabilityMetrics(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const metricName = url.searchParams.get("name") || "http_request_duration_ms";
    const since = url.searchParams.get("since") || new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const repo = new ObservabilityRepository(env);
    const metrics = await repo.getMetricsSince(metricName, since);
    return json({ success: true, data: { metrics } }, 200, cors);
  } catch (err) {
    console.error("Observability metrics error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleObservabilityHealthHistory(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const subsystem = url.searchParams.get("subsystem") || "";
    const since = url.searchParams.get("since") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const repo = new ObservabilityRepository(env);
    let query = "SELECT * FROM health_history WHERE checked_at >= ?";
    const bindings: unknown[] = [since];
    if (subsystem) {
      query += " AND subsystem = ?";
      bindings.push(subsystem);
    }
    query += " ORDER BY checked_at DESC LIMIT 100";
    const rows = await env.DB.prepare(query).bind(...bindings).all();
    return json({ success: true, data: { entries: rows.results || [] } }, 200, cors);
  } catch (err) {
    console.error("Observability health history error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleObservabilityAlerts(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const alerts = await evaluateAlerts(env, user.clinic_id || 1);
    return json({ success: true, data: { alerts } }, 200, cors);
  } catch (err) {
    console.error("Observability alerts error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleObservabilityExport(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const service = new ObservabilityService(env);
    const dashboard = await service.getDashboard(user.clinic_id || 1);

    switch (format) {
      case "csv":
        return new Response(exportEventsToCSV([]), { status: 200, headers: { "Content-Type": "text/csv", ...cors } });
      case "prometheus":
        return new Response(exportToPrometheus(dashboard), { status: 200, headers: { "Content-Type": "text/plain", ...cors } });
      case "json":
      default:
        return json({ success: true, data: dashboard }, 200, cors);
    }
  } catch (err) {
    console.error("Observability export error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}