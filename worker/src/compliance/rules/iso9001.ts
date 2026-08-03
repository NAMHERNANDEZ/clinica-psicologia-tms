import type { ComplianceRule } from "../types";

export const ISO9001_RULES: ComplianceRule[] = [
  {
    id: "iso9001-quality-metrics",
    name: "M\u00e9tricas de calidad actualizadas",
    category: "ISO9001",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "iso9001-satisfaction",
    name: "Encuesta de satisfacci\u00f3n del paciente",
    category: "ISO9001",
    severity: "LOW",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "iso9001-response-time",
    name: "Tiempo de respuesta dentro de l\u00edmite",
    category: "ISO9001",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_DATE",
  },
  {
    id: "iso9001-no-show",
    name: "Tasa de no-asistencia dentro de margen",
    category: "ISO9001",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_MAX",
  },
  {
    id: "iso9001-process",
    name: "Proceso documentado y seguido",
    category: "ISO9001",
    severity: "LOW",
    enabled: true,
    check_type: "CHECK_REQUIRED",
  },
];