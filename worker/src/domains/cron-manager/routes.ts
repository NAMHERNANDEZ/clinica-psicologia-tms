import type { Env, User } from "../../types";
import { CronService } from "./service";

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}

export async function handleCronDashboard(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new CronService(env);
    const dashboard = await service.getDashboard();
    return json({ success: true, data: dashboard }, 200, cors);
  } catch (err) {
    console.error("Cron dashboard error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleCronJobs(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const service = new CronService(env);
    
    if (request.method === "GET") {
      const url = new URL(request.url);
      const enabled = url.searchParams.get("enabled");
      const result = await service.listJobs(enabled === "true" ? true : enabled === "false" ? false : undefined);
      return json({ success: true, data: result }, result.success ? 200 : 400, cors);
    }
    
    if (request.method === "POST") {
      const body = await request.json() as { name: string; schedule: string; enabled?: number; handler: string };
      const result = await service.createJob(body);
      return json({ success: result.success, data: result }, result.success ? 200 : 400, cors);
    }
    
    return json({ success: false, error: "Method not allowed" }, 405, cors);
  } catch (err) {
    console.error("Cron jobs error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleCronJobDetail(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) return json({ success: false, error: "ID required" }, 400, cors);
    
    const service = new CronService(env);
    
    if (request.method === "GET") {
      const result = await service.getJob(id);
      return json({ success: result.success, data: result.job }, result.success ? 200 : 404, cors);
    }
    
    if (request.method === "PATCH") {
      const body = await request.json() as { schedule?: string; enabled?: number; status?: string };
      const result = await service.updateJob(id, body);
      return json({ success: result.success, data: result.job }, result.success ? 200 : 400, cors);
    }
    
    if (request.method === "DELETE") {
      const result = await service.deleteJob(id);
      return json({ success: result.success }, result.success ? 200 : 400, cors);
    }
    
    return json({ success: false, error: "Method not allowed" }, 405, cors);
  } catch (err) {
    console.error("Cron job detail error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleRunCronJob(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { job_id: number };
    if (!body.job_id) return json({ success: false, error: "job_id required" }, 400, cors);
    
    const service = new CronService(env);
    const result = await service.runJob(body.job_id);
    return json({ success: result.success, data: result }, result.success ? 200 : 400, cors);
  } catch (err) {
    console.error("Run cron job error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleCronExecutions(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const service = new CronService(env);
    const result = await service.getExecutions(jobId ? parseInt(jobId) : undefined, limit);
    return json({ success: true, data: result }, 200, cors);
  } catch (err) {
    console.error("Cron executions error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleCronFailures(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const resolved = url.searchParams.get("resolved");
    const service = new CronService(env);
    const failures = await service.getFailures(resolved === "true" ? true : resolved === "false" ? false : undefined);
    return json({ success: true, data: { failures } }, 200, cors);
  } catch (err) {
    console.error("Cron failures error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}

export async function handleResolveCronFailure(env: Env, request: Request, user: User, cors: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { failure_id: number };
    if (!body.failure_id) return json({ success: false, error: "failure_id required" }, 400, cors);
    
    const service = new CronService(env);
    const result = await service.resolveFailure(body.failure_id);
    return json({ success: result.success }, result.success ? 200 : 400, cors);
  } catch (err) {
    console.error("Resolve cron failure error:", err);
    return json({ success: false, error: "Internal error" }, 500, cors);
  }
}