import type { ComplianceRule } from "../types";

export const ISO27001_RULES: ComplianceRule[] = [
  {
    id: "iso27001-login",
    name: "Intento de login v\u00e1lido",
    category: "ISO27001",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "iso27001-audit",
    name: "Auditor\u00eda activa",
    category: "ISO27001",
    severity: "CRITICAL",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "iso27001-access",
    name: "Acceso con rol v\u00e1lido",
    category: "ISO27001",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_REQUIRED",
  },
  {
    id: "iso27001-session",
    name: "Sesi\u00f3n no expirada",
    category: "ISO27001",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_DATE",
  },
  {
    id: "iso27001-backup",
    name: "Backup verificado",
    category: "ISO27001",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
];