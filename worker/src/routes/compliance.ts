import type { Env, User } from "../types";
import type { ComplianceAlert, ComplianceRun } from "../compliance/types";
import { ComplianceService } from "../compliance/service";
import { calculateDashboardMetrics } from "../compliance/dashboard/metrics";
import { generateJsonReport, generateCsvReport } from "../compliance/reports/report-generator";
import { logAudit } from "../lib/audit";

function json(data: unknown, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  const body = typeof data === "object" && data !== null && "success" in (data as Record<string, unknown>)
    ? { ...(data as Record<string, unknown>), requestId }
    : { success: true, data, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function jsonError(error: string, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  return new Response(JSON.stringify({ success: false, error, requestId }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export async function handleComplianceDashboard(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const metrics = await calculateDashboardMetrics(env);
    return json({ success: true, data: metrics }, 200, corsHeaders, requestId);
  } catch (err) {
    console.error(`[${requestId}] Dashboard error:`, err);
    return jsonError("Internal error", 500, corsHeaders, requestId);
  }
}

export async function handleComplianceAlerts(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const service = new ComplianceService(env);
    const alerts = status ? await service.getAlerts(status) : await service.getAlerts();
    return json({ success: true, data: alerts }, 200, corsHeaders, requestId);
  } catch (err) {
    console.error(`[${requestId}] Alerts error:`, err);
    return jsonError("Internal error", 500, corsHeaders, requestId);
  }
}

export async function handleComplianceRun(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const patientId = url.searchParams.get("patient_id");
  const service = new ComplianceService(env);

  if (patientId) {
    const pid = parseInt(patientId);
    let results;
    try {
      results = await service.runForPatient(pid);
      console.log(`[${requestId}] Compliance run for patient ${pid}: ${results.length} results`);
    } catch (runErr) {
      const errMsg = runErr instanceof Error ? runErr.message : String(runErr);
      console.error(`[${requestId}] runForPatient error:`, errMsg);
      return jsonError("Run error: " + errMsg, 500, corsHeaders, requestId);
    }
    let alerts: ComplianceAlert[] = [];
    try {
      alerts = await service.getAlertsForPatient(pid);
    } catch {
      alerts = [];
    }
    return json({ success: true, data: { patientId: pid, results, alerts } }, 200, corsHeaders, requestId);
  }

  const patientsResult = await env.DB.prepare("SELECT id FROM patients").all<{ id: number }>();
  let totalPatients = 0;
  let totalAlerts = 0;

  for (const p of patientsResult.results || []) {
    totalPatients++;
    const results = await service.runForPatient(p.id);
    totalAlerts += results.filter((r) => !r.passed).length;
    await logAudit(env, user.clinic_id || 1, user.id || null, "COMPLIANCE", "compliance_run", "compliance" as any, undefined, JSON.stringify({ patientId: p.id, results: results.length }), request.headers.get("CF-Connecting-IP") || "unknown", request.headers.get("User-Agent") || "unknown", "info", { requestId } as any);
  }

  return json({ success: true, data: { patientsReviewed: totalPatients, alertsCreated: totalAlerts } }, 200, corsHeaders, requestId);
}

export async function handleComplianceReportJson(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const service = new ComplianceService(env);
    const metrics = await calculateDashboardMetrics(env);
    const alerts = await service.getAlerts();
    const runsData = await env.DB.prepare("SELECT * FROM compliance_runs ORDER BY id DESC LIMIT 10").all() as unknown;
    const runs = (runsData as any).results || [] as ComplianceRun[];
    const report = await generateJsonReport(metrics, alerts as any, runs);
    return new Response(report, {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error(`[${requestId}] Report error:`, err);
    return jsonError("Internal error", 500, corsHeaders, requestId);
  }
}

export async function handleComplianceReportCsv(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const service = new ComplianceService(env);
    const alerts = await service.getAlerts();
    const csv = await generateCsvReport(alerts as any);
    return new Response(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv", ...corsHeaders },
    });
  } catch (err) {
    console.error(`[${requestId}] CSV error:`, err);
    return jsonError("Internal error", 500, corsHeaders, requestId);
  }
}