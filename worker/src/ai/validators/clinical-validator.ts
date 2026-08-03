// Validator clinico de marketing AI
// Dos niveles: BLOCKED (critico -> rechaza) y WARNING (requiere revision humana).
// Nunca se publica contenido sin pasar por aqui.

export type ValidationLevel = 'blocked' | 'warning';

export interface ValidationIssue {
  level: ValidationLevel;
  term: string;
  message: string;
}

export interface ValidationResult {
  score: number;
  status: 'approved' | 'requires_review' | 'blocked';
  issues: ValidationIssue[];
  warnings: string[];
  blocked: string[];
}

// Terminos prohibidos (nivel critico): prometen cura/garantias/efectos inexistentes.
const BLOCKED_TERMS: Array<{ term: string; reason: string }> = [
  { term: 'cura', reason: 'Promesa de curacion no permitida' },
  { term: 'garantizad', reason: 'Garantia de resultado no permitida' },
  { term: 'sin efectos secundarios', reason: 'Negacion absoluta de efectos no permitida' },
  { term: '100%', reason: 'Porcentaje absoluto no permitido' },
  { term: 'elimina', reason: 'Promesa de eliminacion no permitida' },
  { term: 'cura definitivamente', reason: 'Curacion definitiva no permitida' },
  { term: 'solo ven', reason: 'Resultado unico/lineal no permitido' },
  { term: 'siempre', reason: 'Afirmacion absoluta no permitida' },
  { term: 'todos los pacientes', reason: 'Generalizacion total no permitida' },
  { term: 'ningun riesgo', reason: 'Negacion de riesgo no permitida' },
  { term: 'milagroso', reason: 'Exageracion no permitida' },
  { term: 'infalible', reason: 'Infalibilidad no permitida' },
  { term: 'definitivo', reason: 'Resultado definitivo no permitido' },
];

// Terminos que requieren contexto/evidencia (nivel de advertencia).
const WARNING_TERMS: Array<{ term: string; reason: string }> = [
  { term: 'mejora', reason: 'Verificar que no prometa resultado garantizado' },
  { term: 'mejorar', reason: 'Verificar que no prometa resultado garantizado' },
  { term: 'beneficio', reason: 'Verificar contexto de beneficio' },
  { term: 'beneficios', reason: 'Verificar contexto de beneficio' },
  { term: 'resultado', reason: 'Verificar que no prometa resultado garantizado' },
  { term: 'resultados', reason: 'Verificar que no prometa resultado garantizado' },
  { term: 'efectivo', reason: 'Verificar eficacia sin exagerar' },
  { term: 'efectiva', reason: 'Verificar eficacia sin exagerar' },
  { term: 'efectivos', reason: 'Verificar eficacia sin exagerar' },
  { term: 'tratamiento exitoso', reason: 'Verificar sustento de exito' },
  { term: 'recuperacion total', reason: 'Recuperacion total no garantizable' },
  { term: 'alivio total', reason: 'Alivio total no garantizable' },
  { term: 'desaparece', reason: 'Desaparicion de sintomas no garantizable' },
];

const REQUIRED_DISCLAIMER = 'valoracion profesional';
const REQUIRED_DISCLAIMER_ALT = 'evalua';
const REQUIRED_DISCLAIMER_ALT2 = 'profesional de salud';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Valida contenido de marketing clinico.
 * - Cualquier termino BLOCKED -> status 'blocked', score 0.
 * - Solo terminos WARNING -> status 'requires_review', score penalizado.
 * - Sin issues -> status 'approved', score >= 85 (falta disclaimer resta puntos).
 */
export function validateClinicalContent(text: string): ValidationResult {
  const normalized = normalize(text);
  const issues: ValidationIssue[] = [];
  const blocked: string[] = [];
  const warnings: string[] = [];

  for (const b of BLOCKED_TERMS) {
    if (normalized.includes(normalize(b.term))) {
      issues.push({ level: 'blocked', term: b.term, message: b.reason });
      blocked.push(b.term);
    }
  }

  for (const w of WARNING_TERMS) {
    if (normalized.includes(normalize(w.term))) {
      issues.push({ level: 'warning', term: w.term, message: w.reason });
      warnings.push(w.term);
    }
  }

  if (blocked.length > 0) {
    return {
      score: 0,
      status: 'blocked',
      issues,
      warnings,
      blocked,
    };
  }

  let score = 100;
  // Cada warning resta puntos, pero no bloquea.
  score -= warnings.length * 5;
  // Debe existir disclaimer de valoracion profesional para marketing clinico.
  const hasDisclaimer = [REQUIRED_DISCLAIMER, REQUIRED_DISCLAIMER_ALT, REQUIRED_DISCLAIMER_ALT2].some(t => normalized.includes(t));
  if (!hasDisclaimer) {
    score -= 15;
    issues.push({
      level: 'warning',
      term: '(disclaimer)',
      message: 'Falta referencia a valoracion profesional previa',
    });
    if (!warnings.includes('(disclaimer)')) warnings.push('(disclaimer)');
  }

  const finalScore = clampScore(score);
  const status: ValidationResult['status'] = finalScore >= 85 ? 'approved' : 'requires_review';

  return { score: finalScore, status, issues, warnings, blocked };
}
