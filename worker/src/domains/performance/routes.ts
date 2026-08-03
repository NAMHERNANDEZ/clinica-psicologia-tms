import type { Env, User } from "../../types";
import { PerformanceService } from "./service";

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export async function handlePerformanceDashboard(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get("hours") || "24");
    const service = new PerformanceService(env);
    const dashboard = await service.getDashboard(hours);
    return json({ success: true, data: dashboard }, 200, cors);
  } catch (err) {
    console.error("Performance dashboard error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleSlowQueries(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const endpoint = url.searchParams.get("endpoint");
    const service = new PerformanceService(env);

    if (endpoint) {
      const queries = await service.getSlowQueriesByEndpoint(endpoint, limit);
      return json({ success: true, data: { queries } }, 200, cors);
    }

    const dashboard = await service.getDashboard(24);
    return json({ success: true, data: { queries: dashboard.database.slowest_queries } }, 200, cors);
  } catch (err) {
    console.error("Slow queries error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleQueryProfiles(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const service = new PerformanceService(env);
    const profiles = await service.getQueryProfiles(limit);
    return json({ success: true, data: { profiles } }, 200, cors);
  } catch (err) {
    console.error("Query profiles error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleCacheStats(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new PerformanceService(env);
    const hitRatio = await service.getCacheHitRatio(24);
    return json({ success: true, data: { hit_ratio: hitRatio } }, 200, cors);
  } catch (err) {
    console.error("Cache stats error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleWorkerPerformance(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const dashboard = await new PerformanceService(env).getDashboard(24);
    return json({ success: true, data: { worker: dashboard.worker } }, 200, cors);
  } catch (err) {
    console.error("Worker performance error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleAnomalies(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new PerformanceService(env);
    const anomalies = await service.detectAnomalies(24);
    return json({ success: true, data: { anomalies } }, 200, cors);
  } catch (err) {
    console.error("Anomalies error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}