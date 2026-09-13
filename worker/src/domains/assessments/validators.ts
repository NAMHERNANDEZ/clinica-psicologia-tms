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
// WELLBEING SCALE DEFINITIONS (self-reported, short)
// ============================================

export const WELLBEING_SCALE_DEFINITIONS: Record<string, ScaleDefinition> = {
  'stress-pss4': {
    id: 'stress-pss4',
    name: 'PSS-4',
    full_name: 'Perceived Stress Scale-4',
    description: 'Evaluación breve de estrés percibido. 4 ítems, cada uno 0-4.',
    condition: 'Estrés percibido',
    max_score: 16,
    item_count: 4,
    time_to_complete: '~1 min',
    source: 'Cohen et al., 1983 (adaptado)',
  },
  'sleep-sq5': {
    id: 'sleep-sq5',
    name: 'SQ-5',
    full_name: 'Sleep Quality-5',
    description: 'Calidad de sueño breve. 5 ítems, cada uno 0-3.',
    condition: 'Calidad de sueño',
    max_score: 15,
    item_count: 5,
    time_to_complete: '~1 min',
    source: 'Basado en PSQI abreviado',
  },
  'wellbeing-who5': {
    id: 'wellbeing-who5',
    name: 'WHO-5',
    full_name: 'WHO-5 Well-Being Index',
    description: 'Bienestar emocional general. 5 ítems, cada uno 0-5.',
    condition: 'Bienestar emocional',
    max_score: 25,
    item_count: 5,
    time_to_complete: '~1 min',
    source: 'WHO, 1998',
  },
  'activation-gad2': {
    id: 'activation-gad2',
    name: 'GAD-2',
    full_name: 'Generalized Anxiety Disorder-2',
    description: 'Activación/ansiedad cotidiana. 2 ítems, cada uno 0-3.',
    condition: 'Activación/Ansiedad',
    max_score: 6,
    item_count: 2,
    time_to_complete: '~30 seg',
    source: 'Kroenke et al., 2007',
  },
  'energy-vas3': {
    id: 'energy-vas3',
    name: 'VAS-3',
    full_name: 'Vitality Assessment Scale-3',
    description: 'Nivel de energía y vitalidad. 3 ítems, cada uno 0-10.',
    condition: 'Energía/Vitalidad',
    max_score: 30,
    item_count: 3,
    time_to_complete: '~1 min',
    source: 'Adaptado de SF-36 vitality',
  },
  'focus-cfq3': {
    id: 'focus-cfq3',
    name: 'CFQ-3',
    full_name: 'Cognitive Failure Questionnaire-3',
    description: 'Concentración y fallos cognitivos cotidianos. 3 ítems, cada uno 0-4.',
    condition: 'Concentración/Foco',
    max_score: 12,
    item_count: 3,
    time_to_complete: '~1 min',
    source: 'Broadbent et al., 1982 (adaptado)',
  },
};

// Combined for lookup
export const ALL_SCALE_DEFINITIONS = {
  ...SCALE_DEFINITIONS,
  ...WELLBEING_SCALE_DEFINITIONS,
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
// WELLBEING CUTOFFS (wellbeing bands, NOT clinical severity)
// ============================================

export const WELLBEING_CUTOFFS: Record<string, ScaleCutoff[]> = {
  'stress-pss4': [
    { scale_id: 'stress-pss4', min_score: 0, max_score: 4, severity: 'low', label: 'Bajo', color: '#22C55E', recommendation: 'Estrés percibido bajo. Mantén hábitos saludables.' },
    { scale_id: 'stress-pss4', min_score: 5, max_score: 9, severity: 'moderate', label: 'Moderado', color: '#F59E0B', recommendation: 'Estrés moderado. Considera técnicas de relajación.' },
    { scale_id: 'stress-pss4', min_score: 10, max_score: 16, severity: 'high', label: 'Alto', color: '#EF4444', recommendation: 'Estrés alto. Prioriza autocuidado y busca apoyo si persiste.' },
  ],
  'sleep-sq5': [
    { scale_id: 'sleep-sq5', min_score: 0, max_score: 5, severity: 'good', label: 'Buena', color: '#22C55E', recommendation: 'Calidad de sueño buena. Mantén tu rutina.' },
    { scale_id: 'sleep-sq5', min_score: 6, max_score: 10, severity: 'fair', label: 'Regular', color: '#F59E0B', recommendation: 'Calidad de sueño regular. Revisa higiene del sueño.' },
    { scale_id: 'sleep-sq5', min_score: 11, max_score: 15, severity: 'poor', label: 'Mala', color: '#EF4444', recommendation: 'Calidad de sueño mala. Considera evaluar factores que afecten tu descanso.' },
  ],
  'wellbeing-who5': [
    { scale_id: 'wellbeing-who5', min_score: 21, max_score: 25, severity: 'high', label: 'Alto', color: '#22C55E', recommendation: 'Bienestar alto. Sigue cuidando tu salud mental.' },
    { scale_id: 'wellbeing-who5', min_score: 13, max_score: 20, severity: 'moderate', label: 'Moderado', color: '#F59E0B', recommendation: 'Bienestar moderado. Pequeños cambios pueden ayudar.' },
    { scale_id: 'wellbeing-who5', min_score: 0, max_score: 12, severity: 'low', label: 'Bajo', color: '#EF4444', recommendation: 'Bienestar bajo. Considera hablar con un profesional.' },
  ],
  'activation-gad2': [
    { scale_id: 'activation-gad2', min_score: 0, max_score: 1, severity: 'low', label: 'Baja', color: '#22C55E', recommendation: 'Activación baja. Estado de calma.' },
    { scale_id: 'activation-gad2', min_score: 2, max_score: 3, severity: 'moderate', label: 'Moderada', color: '#F59E0B', recommendation: 'Activación moderada. Técnicas de respiración pueden ayudar.' },
    { scale_id: 'activation-gad2', min_score: 4, max_score: 6, severity: 'high', label: 'Alta', color: '#EF4444', recommendation: 'Activación alta. Prioriza técnicas de regulación y busca apoyo.' },
  ],
  'energy-vas3': [
    { scale_id: 'energy-vas3', min_score: 21, max_score: 30, severity: 'high', label: 'Alta', color: '#22C55E', recommendation: 'Energía alta. Aprovecha tu vitalidad.' },
    { scale_id: 'energy-vas3', min_score: 11, max_score: 20, severity: 'moderate', label: 'Moderada', color: '#F59E0B', recommendation: 'Energía moderada. Balancea actividad y descanso.' },
    { scale_id: 'energy-vas3', min_score: 0, max_score: 10, severity: 'low', label: 'Baja', color: '#EF4444', recommendation: 'Energía baja. Prioriza recuperación y sueño.' },
  ],
  'focus-cfq3': [
    { scale_id: 'focus-cfq3', min_score: 0, max_score: 3, severity: 'good', label: 'Buena', color: '#22C55E', recommendation: 'Concentración buena. Pocos fallos cognitivos.' },
    { scale_id: 'focus-cfq3', min_score: 4, max_score: 7, severity: 'fair', label: 'Regular', color: '#F59E0B', recommendation: 'Concentración regular. Pausas activas pueden ayudar.' },
    { scale_id: 'focus-cfq3', min_score: 8, max_score: 12, severity: 'poor', label: 'Mala', color: '#EF4444', recommendation: 'Concentración dificultada. Reduce multitarea y toma descansos.' },
  ],
};

// Combined for lookup
export const ALL_SCALE_CUTOFFS = {
  ...SCALE_CUTOFFS,
  ...WELLBEING_CUTOFFS,
};

// ============================================
// SCORING HELPER
// ============================================

export function calculateScore(scaleId: string, responses: ScaleResponseInput[]): {
  score: number;
  maxScore: number;
  itemCount: number;
} {
  // Use combined definitions for both clinical and wellbeing
  const scale = ALL_SCALE_DEFINITIONS[scaleId];
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
  const cutoffs = ALL_SCALE_CUTOFFS[scaleId];
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
// VALID SCALE IDS (clinical + wellbeing)
// ============================================

export const VALID_SCALE_IDS = Object.keys(ALL_SCALE_DEFINITIONS);

export function isValidScaleId(scaleId: string): boolean {
  return VALID_SCALE_IDS.includes(scaleId);
}

// ============================================
// DOMAIN HELPERS
// ============================================

export function getScaleDomain(scaleId: string): 'clinical' | 'wellbeing' | 'unknown' {
  if (scaleId in SCALE_DEFINITIONS) return 'clinical';
  if (scaleId in WELLBEING_SCALE_DEFINITIONS) return 'wellbeing';
  return 'unknown';
}

export function getClinicalScaleIds(): string[] {
  return Object.keys(SCALE_DEFINITIONS);
}

export function getWellbeingScaleIds(): string[] {
  return Object.keys(WELLBEING_SCALE_DEFINITIONS);
}
