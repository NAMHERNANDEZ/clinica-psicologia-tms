import type { ComplianceRule, ComplianceResult } from "../types";
import { executeCheck } from "../checks/check-runner";
import { loadPatientContext } from "../loader";

export async function executeAllRules(
  patientId: number,
  env: { DB: D1Database }
): Promise<ComplianceResult[]> {
  const rules = await loadAllRules(env);
  if (!rules.length) return [];

  const ctx = await loadPatientContext(patientId, env);

  const results: ComplianceResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    try {
      const result = await executeCheck(rule, patientId, ctx);
      result.ruleId = rule.code || rule.id;
      result.patientId = patientId;
      results.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Rule execution error:", rule.id, msg);
      results.push({
        passed: false,
        message: "Error interno: " + msg,
        severity: "HIGH",
        patientId,
        ruleId: rule.code || rule.id,
      });
    }
  }

  return results;
}

async function loadAllRules(
  env: { DB: D1Database }
): Promise<ComplianceRule[]> {
  const result = await env.DB
    .prepare("SELECT id, code, name, category, severity, check_type, enabled, version, description, effective_from, effective_to FROM compliance_rules WHERE enabled = 1 AND (effective_to IS NULL OR effective_to > datetime('now'))")
    .all();
  return (result.results || []) as unknown as ComplianceRule[];
}