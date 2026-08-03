import type { Env } from "../../types";
import { ObservabilityService } from "./service";

export async function handleObservabilityDashboard(env: Env, request: Request, user: any, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new ObservabilityService(env);
    const dashboard = await service.getDashboard(user.clinic_id || 1);
    return json({ success: true, data: dashboard }, 200, cors);
  } catch (err) {
    console.error("Observability dashboard error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}