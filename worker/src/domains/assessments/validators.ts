// ============================================
// TYPES — worker/src/domains/assessments/validators.ts
// ============================================

export interface AssessmentInput {
  patient_id: number;
  assessment_type: string;
  score: number;
  max_score: number;
  interpretation: string;
  administered_at: string;
  responses_json?: string; // JSON con respuestas individuales
}

export interface ScaleResponseInput {
  scale_id: string;
  item_id: string;
  value: number;
}

export interface ScaleAssessmentInput {
  patient_id: number;
  scale_id: string;
  responses: ScaleResponseInput[];
  administered_at: string;
}

export interface ScaleDefinition {
  id: string;
  name: string;
  full_name: string;
  description: string;
  condition: string;
  max_score: number;
  item_count: number;
  time_to_complete: string;
  source: string;
}

export interface ScaleItem {
  id: string;
  scale_id: string;
  item_number: number;
  text: string;
  options_json: string; // JSON: {value: number, label: string}[]
}

export interface ScaleCutoff {
  scale_id: string;
  min_score: number;
  max_score: number;
  severity: string;
  label: string;
  color: string;
  recommendation?: string;
}

// ============================================
// VALIDATORS
// ============================================

export function validateAssessmentInput(data: unknown): 
  | { valid: true; data: AssessmentInput }
  | { valid: false; error: string } {
  
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') {
    return { valid: false, error: 'patient_id es requerido y debe ser un número' };
  }

  if (!input.assessment_type || typeof input.assessment_type !== 'string') {
    return { valid: false, error: 'assessment_type es requerido' };
  }

  if (typeof input.score !== 'number' || input.score < 0) {
    return { valid: false, error: 'score debe ser un número no negativo' };
  }

  if (typeof input.max_score !== 'number' || input.max_score <= 0) {
    return { valid: false, error: 'max_score debe ser un número positivo' };
  }

  if (input.score > input.max_score) {
    return { valid: false, error: 'score no puede ser mayor que max_score' };
  }

  if (!input.administered_at || typeof input.administered_at !== 'string') {
    return { valid: false, error: 'administered_at es requerido' };
  }

  // Validar formato ISO de fecha
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!dateRegex.test(input.administered_at)) {
    return { valid: false, error: 'administered_at debe tener formato ISO 8601' };
  }

  if (input.responses_json !== undefined && typeof input.responses_json !== 'string') {
    return { valid: false, error: 'responses_json debe ser una cadena JSON' };
  }

  return {
    valid: true,
    data: {
      patient_id: input.patient_id as number,
      assessment_type: input.assessment_type as string,
      score: input.score as number,
      max_score: input.max_score as number,
      interpretation: (input.interpretation as string) || '',
      administered_at: input.administered_at as string,
      responses_json: input.responses_json as string | undefined,
    },
  };
}

export function validateScaleAssessmentInput(data: unknown):
  | { valid: true; data: ScaleAssessmentInput }
  | { valid: false; error: string } {
  
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') {
    return { valid: false, error: 'patient_id es requerido y debe ser un número' };
  }

  if (!input.scale_id || typeof input.scale_id !== 'string') {
    return { valid: false, error: 'scale_id es requerido' };
  }

  if (!Array.isArray(input.responses)) {
    return { valid: false, error: 'responses debe ser un array' };
  }

  if (input.responses.length === 0) {
    return { valid: false, error: 'responses no puede estar vacío' };
  }

  for (let i = 0; i < input.responses.length; i++) {
    const response = input.responses[i] as Record<string, unknown>;
    if (!response.item_id || typeof response.item_id !== 'string') {
      return { valid: false, error: `responses[${i}].item_id es requerido` };
    }
    if (typeof response.value !== 'number') {
      return { valid: false, error: `responses[${i}].value debe ser un número` };
    }
  }

  if (!input.administered_at || typeof input.administered_at !== 'string') {
    return { valid: false, error: 'administered_at es requerido' };
  }

  return {
    valid: true,
    data: {
      patient_id: input.patient_id as number,
      scale_id: input.scale_id as string,
      responses: input.responses as ScaleResponseInput[],
      administered_at: input.administered_at as string,
    },
  };
}

export function validatePatientId(patientId: unknown): 
  | { valid: true; data: number }
  | { valid: false; error: string } {
  
  if (patientId === undefined || patientId === null) {
    return { valid: false, error: 'patient_id es requerido' };
  }
  
  const id = typeof patientId === 'string' ? parseInt(patientId) : Number(patientId);
  
  if (isNaN(id) || !Number.isFinite(id)) {
    return { valid: false, error: 'patient_id debe ser un número válido' };
  }
  
  return { valid: true, data: id };
}

// ============================================
// SCALE DEFINITIONS (backend-side)
// ============================================

export const SCALE_DEFINITIONS: Record<string, ScaleDefinition> = {
  phq9: {
    id: 'phq9',
    name: 'PHQ-9',
    full_name: 'Patient Health Questionnaire-9',
    description: 'Screening de depresión. 9 ítems, cada uno 0-3.',
    condition: 'Depresión, Ansiedad, TEPT',
    max_score: 27,
    item_count: 9,
    time_to_complete: '~2 min',
    source: 'Kroenke et al., 2001',
  },
  gad7: {
    id: 'gad7',
    name: 'GAD-7',
    full_name: 'Generalized Anxiety Disorder-7',
    description: 'Screening de ansiedad generalizada. 7 ítems, cada uno 0-3.',
    condition: 'Ansiedad Generalizada',
    max_score: 21,
    item_count: 7,
    time_to_complete: '~1.5 min',
    source: 'Spitzer et al., 2006',
  },
  bdii: {
    id: 'bdii',
    name: 'BDI-II',
    full_name: 'Beck Depression Inventory-II',
    description: 'Inventario de depresión de Beck. 21 ítems, cada uno 0-3.',
    condition: 'Depresión',
    max_score: 63,
    item_count: 21,
    time_to_complete: '~5 min',
    source: 'Beck et al., 1996',
  },
  pcl5: {
    id: 'pcl5',
    name: 'PCL-5',
    full_name: 'PTSD Checklist for DSM-5',
    description: 'Evaluación de TEPT. 20 ítems, cada uno 0-4.',
    condition: 'TEPT',
    max_score: 80,
    item_count: 20,
    time_to_complete: '~5 min',
    source: 'Weathers et al., 2013',
  },
  audit: {
    id: 'audit',
    name: 'AUDIT',
    full_name: 'Alcohol Use Disorders Identification Test',
    description: 'Screening de consumo de alcohol. 10 ítems.',
    condition: 'Alcohol',
    max_score: 40,
    item_count: 10,
    time_to_complete: '~2 min',
    source: 'WHO, 2001',
  },
  dass21: {
    id: 'dass21',
    name: 'DASS-21',
    full_name: 'Depression Anxiety Stress Scales-21',
    description: 'Evaluación de depresión, ansiedad y estrés. 21 ítems.',
    condition: 'Depresión, Ansiedad, Estrés',
    max_score: 63,
    item_count: 21,
    time_to_complete: '~5 min',
    source: 'Lovibond & Lovibond, 1995',
  },
};

// ============================================
// CUTOFFS (severity thresholds)
// ============================================

export const SCALE_CUTOFFS: Record<string, ScaleCutoff[]> = {
  phq9: [
    { scale_id: 'phq9', min_score: 0, max_score: 4, severity: 'minimal', label: 'Mínima', color: '#22C55E', recommendation: 'Monitoreo rutinario' },
    { scale_id: 'phq9', min_score: 5, max_score: 9, severity: 'mild', label: 'Leve', color: '#84CC16', recommendation: 'Seguimiento activo' },
    { scale_id: 'phq9', min_score: 10, max_score: 14, severity: 'moderate', label: 'Moderada', color: '#F59E0B', recommendation: 'Plan de tratamiento recomendado' },
    { scale_id: 'phq9', min_score: 15, max_score: 19, severity: 'moderately_severe', label: 'Moderadamente severa', color: '#F97316', recommendation: 'Tratamiento urgente' },
    { scale_id: 'phq9', min_score: 20, max_score: 27, severity: 'severe', label: 'Severa', color: '#EF4444', recommendation: 'Intervención inmediata' },
  ],
  gad7: [
    { scale_id: 'gad7', min_score: 0, max_score: 4, severity: 'minimal', label: 'Mínima', color: '#22C55E', recommendation: 'Monitoreo rutinario' },
    { scale_id: 'gad7', min_score: 5, max_score: 9, severity: 'mild', label: 'Leve', color: '#84CC16', recommendation: 'Seguimiento activo' },
    { scale_id: 'gad7', min_score: 10, max_score: 14, severity: 'moderate', label: 'Moderada', color: '#F59E0B', recommendation: 'Plan de tratamiento recomendado' },
    { scale_id: 'gad7', min_score: 15, max_score: 21, severity: 'severe', label: 'Severa', color: '#EF4444', recommendation: 'Intervención inmediata' },
  ],
  bdii: [
    { scale_id: 'bdii', min_score: 0, max_score: 13, severity: 'minimal', label: 'Mínima', color: '#22C55E', recommendation: 'Monitoreo rutinario' },
    { scale_id: 'bdii', min_score: 14, max_score: 19, severity: 'mild', label: 'Leve', color: '#84CC16', recommendation: 'Seguimiento activo' },
    { scale_id: 'bdii', min_score: 20, max_score: 28, severity: 'moderate', label: 'Moderada', color: '#F59E0B', recommendation: 'Plan de tratamiento recomendado' },
    { scale_id: 'bdii', min_score: 29, max_score: 42, severity: 'severe', label: 'Severa', color: '#F97316', recommendation: 'Tratamiento urgente' },
    { scale_id: 'bdii', min_score: 43, max_score: 63, severity: 'very_severe', label: 'Muy severa', color: '#EF4444', recommendation: 'Intervención inmediata' },
  ],
  pcl5: [
    { scale_id: 'pcl5', min_score: 0, max_score: 30, severity: 'subclinical', label: 'Subclínico', color: '#22C55E', recommendation: 'Monitoreo rutinario' },
    { scale_id: 'pcl5', min_score: 31, max_score: 50, severity: 'mild', label: 'Leve', color: '#84CC16', recommendation: 'Seguimiento activo' },
    { scale_id: 'pcl5', min_score: 51, max_score: 65, severity: 'moderate', label: 'Moderado', color: '#F59E0B', recommendation: 'Tratamiento recomendado' },
    { scale_id: 'pcl5', min_score: 66, max_score: 80, severity: 'severe', label: 'Severo', color: '#EF4444', recommendation: 'Intervención inmediata' },
  ],
  audit: [
    { scale_id: 'audit', min_score: 0, max_score: 7, severity: 'low_risk', label: 'Bajo riesgo', color: '#22C55E', recommendation: 'Educación sobre alcohol' },
    { scale_id: 'audit', min_score: 8, max_score: 15, severity: 'risky', label: 'Riesgo', color: '#F59E0B', recommendation: 'Consejería breve' },
    { scale_id: 'audit', min_score: 16, max_score: 19, severity: 'harmful', label: 'Consumo nocivo', color: '#F97316', recommendation: 'Tratamiento especializado' },
    { scale_id: 'audit', min_score: 20, max_score: 40, severity: 'dependence', label: 'Posible dependencia', color: '#EF4444', recommendation: 'Tratamiento urgente' },
  ],
  dass21: [
    { scale_id: 'dass21', min_score: 0, max_score: 9, severity: 'normal', label: 'Normal', color: '#22C55E', recommendation: 'Monitoreo rutinario' },
    { scale_id: 'dass21', min_score: 10, max_score: 13, severity: 'mild', label: 'Leve', color: '#84CC16', recommendation: 'Seguimiento activo' },
    { scale_id: 'dass21', min_score: 14, max_score: 20, severity: 'moderate', label: 'Moderada', color: '#F59E0B', recommendation: 'Plan de tratamiento' },
    { scale_id: 'dass21', min_score: 21, max_score: 27, severity: 'severe', label: 'Severa', color: '#F97316', recommendation: 'Tratamiento urgente' },
    { scale_id: 'dass21', min_score: 28, max_score: 63, severity: 'extremely_severe', label: 'Extremadamente severa', color: '#EF4444', recommendation: 'Intervención inmediata' },
  ],
};

// ============================================
// SCORING HELPER
// ============================================

export function calculateScore(scaleId: string, responses: ScaleResponseInput[]): {
  score: number;
  maxScore: number;
  itemCount: number;
} {
  const scale = SCALE_DEFINITIONS[scaleId];
  if (!scale) {
    return { score: 0, maxScore: 100, itemCount: 0 };
  }

  // Sumar todos los valores de las respuestas
  const score = responses.reduce((sum, r) => sum + r.value, 0);
  
  return {
    score,
    maxScore: scale.max_score,
    itemCount: scale.item_count,
  };
}

export function interpretScore(scaleId: string, score: number): ScaleCutoff | null {
  const cutoffs = SCALE_CUTOFFS[scaleId];
  if (!cutoffs) return null;

  for (const cutoff of cutoffs) {
    if (score >= cutoff.min_score && score <= cutoff.max_score) {
      return cutoff;
    }
  }

  // Si no hay match, devolver el último
  return cutoffs[cutoffs.length - 1] || null;
}

// ============================================
// VALID SCALE IDS
// ============================================

export const VALID_SCALE_IDS = Object.keys(SCALE_DEFINITIONS);

export function isValidScaleId(scaleId: string): boolean {
  return VALID_SCALE_IDS.includes(scaleId);
}
