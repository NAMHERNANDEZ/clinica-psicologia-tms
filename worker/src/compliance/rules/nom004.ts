import type { ComplianceRule } from "../types";

export const NOM004_RULES: ComplianceRule[] = [
  {
    id: "nom004-consent",
    name: "Consentimiento informado firmado",
    category: "NOM",
    severity: "CRITICAL",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "nom004-record",
    name: "Expediente cl\u00ednico completo",
    category: "NOM",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_REQUIRED",
  },
  {
    id: "nom004-note",
    name: "Nota SOAP completa",
    category: "NOM",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_NOT_EMPTY",
  },
  {
    id: "nom004-diagnosis",
    name: "Diagn\u00f3stico registrado",
    category: "NOM",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_REQUIRED",
  },
  {
    id: "nom004-treatment",
    name: "Plan terap\u00e9utico vigente",
    category: "NOM",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_REQUIRED",
  },
];