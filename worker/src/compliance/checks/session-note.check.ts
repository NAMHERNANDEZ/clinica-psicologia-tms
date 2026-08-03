import type { ComplianceResult } from "../types";

export async function checkSessionNote(
  patientId: number,
  env: { DB: D1Database }
): Promise<ComplianceResult> {
  const note = await env.DB
    .prepare(
      `SELECT id, subjective, objective, assessment, plan FROM session_notes WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .bind(patientId)
    .first<{
      id: number;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    }>();

  if (!note) {
    return {
      passed: false,
      message: "Nota de sesión faltante",
      severity: "HIGH",
    };
  }

  const missing: string[] = [];
  if (!note.subjective) missing.push("subjetivo (S)");
  if (!note.objective) missing.push("objetivo (O)");
  if (!note.assessment) missing.push("análisis (A)");
  if (!note.plan) missing.push("plan (P)");

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Nota SOAP incompleta. Falta: ${missing.join(", ")}`,
      severity: "HIGH",
    };
  }

  return {
    passed: true,
    message: "Nota SOAP completa",
    severity: "LOW",
  };
}