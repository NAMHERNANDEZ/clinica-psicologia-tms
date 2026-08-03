import type { ComplianceRule } from "../types";

export const COFEPRIS_RULES: ComplianceRule[] = [
  {
    id: "cofepris-consent",
    name: "Consentimiento para procedimiento TMS",
    category: "COFEPRIS",
    severity: "CRITICAL",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "cofepris-operator",
    name: "Operador autorizado",
    category: "COFEPRIS",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_REQUIRED",
  },
  {
    id: "cofepris-equipment",
    name: "Equipo registrado y calibrado",
    category: "COFEPRIS",
    severity: "HIGH",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "cofepris-adverse",
    name: "Registro de eventos adversos",
    category: "COFEPRIS",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
  {
    id: "cofepris-followup",
    name: "Seguimiento post-sesi\u00f3n",
    category: "COFEPRIS",
    severity: "MEDIUM",
    enabled: true,
    check_type: "CHECK_EXISTS",
  },
];