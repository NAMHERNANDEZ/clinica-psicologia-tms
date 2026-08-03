import type { ComplianceResult, PatientContext } from "../types";

export async function checkSessionNoteComplete(
  patientId: number,
  ctx: PatientContext
): Promise<ComplianceResult> {
  const note = ctx.latestNote;

  if (!note) {
    return {
      passed: false,
      message: "Nota de sesi\u00f3n SOAP no encontrada",
      severity: "HIGH",
      patientId,
    };
  }

  const missing: string[] = [];
  if (!note.subjective) missing.push("subjetivo (S)");
  if (!note.objective) missing.push("objetivo (O)");
  if (!note.assessment) missing.push("an\u00e1lisis (A)");
  if (!note.plan) missing.push("plan (P)");

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Nota SOAP incompleta. Faltan: ${missing.join(", ")}`,
      severity: "HIGH",
      patientId,
      recordId: note.id,
    };
  }

  return {
    passed: true,
    message: "Nota SOAP completa",
    severity: "LOW",
    patientId,
    recordId: note.id,
  };
}