// ============================================
// SERVICE — worker/src/domains/mental-health/service.ts
// Motor de recomendación V1 (determinista y explicable) + insights V1 + delta.
// NO diagnostica: genera observaciones basadas en el historial del usuario.
// ============================================

export interface CheckInSummary {
  intensity: number;
  activation: number;
  energy: number;
  concentration: number;
  sleep_hours: number | null;
}

export interface SessionRecord {
  intervention_id: number;
  intervention_slug: string;
  category: string;
  before_intensity: number;
  after_intensity: number;
  delta: number;
  completion: number;
  duration_sec: number | null;
  created_at: string;
}

export interface RecommendationDecision {
  intervention_slug: string;
  reason: string;
  evidence: string[];
  alternatives: string[];
  confidence: number;
  safety: boolean;
  safety_message: string | null;
}

const SAFETY_MESSAGE =
  'Has registrado una intensidad emocional muy alta. Esto es un aviso de tu registro, no un diagnóstico. ' +
  'Si sientes que podrías dañarte a ti misma/o o a otras personas, busca ayuda inmediata: ' +
  'en México marca el 911 (emergencias) o Línea de la Vida 800 911 2000 (atención en crisis).';

// ============================================
// DELTA (resultado antes/despues)
// ============================================

export function computeDelta(before: number, after: number): number {
  return after - before; // negativo = reduccion de intensidad
}

// ============================================
// MOTOR DE RECOMENDACION V1 (determinista)
// ============================================

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** De entre un conjunto de slugs, elige el que históricamente haya dado mejor delta medio */
function bestPerforming(sessions: SessionRecord[], slugs: string[], category?: string): string | null {
  const candidates = slugs.filter(slug =>
    sessions.some(s => s.intervention_slug === slug && s.completion === 1)
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    const avgA = mean(sessions.filter(s => s.intervention_slug === a).map(s => s.delta));
    const avgB = mean(sessions.filter(s => s.intervention_slug === b).map(s => s.delta));
    return avgA - avgB;
  })[0];
}

function confidenceFor(sessions: SessionRecord[], slug: string, base: number): number {
  const support = sessions.filter(s => s.intervention_slug === slug && s.completion === 1).length;
  const boost = Math.min(support * 0.08, 0.3);
  return Math.min(1, base + boost);
}

export function computeRecommendation(
  checkIn: CheckInSummary,
  sessions: SessionRecord[]
): RecommendationDecision {
  const { intensity, activation, energy, concentration, sleep_hours } = checkIn;
  const evidence: string[] = [
    `intensity=${intensity}`, `activation=${activation}`, `energy=${energy}`,
    `concentration=${concentration}`,
  ];
  if (sleep_hours !== null) evidence.push(`sleep_hours=${sleep_hours}`);

  // 1. Respuesta de seguridad (sin diagnostico)
  if (intensity >= 9 || activation >= 9) {
    return {
      intervention_slug: 'grounding-54321',
      reason: 'Intensidad emocional muy alta registrada',
      evidence,
      alternatives: ['respiracion-caja', 'respiracion-478'],
      confidence: 0.9,
      safety: true,
      safety_message: SAFETY_MESSAGE,
    };
  }

  // 2. Activacion alta -> respiracion (preferir la historicamente util)
  if (activation >= 7) {
    const chosen = bestPerforming(sessions, ['respiracion-caja', 'respiracion-478'], 'breathing') ?? 'respiracion-caja';
    const alt = chosen === 'respiracion-caja' ? 'respiracion-478' : 'respiracion-caja';
    return {
      intervention_slug: chosen,
      reason: 'Activación alta registrada; una pausa de respiración corta puede ayudar',
      evidence,
      alternatives: [alt, 'grounding-54321'],
      confidence: confidenceFor(sessions, chosen, 0.6),
      safety: false,
      safety_message: null,
    };
  }

  // 3. Intensidad y activacion elevadas
  if (intensity >= 6 && activation >= 5) {
    return {
      intervention_slug: 'respiracion-478',
      reason: 'Intensidad y activación elevadas',
      evidence,
      alternatives: ['respiracion-caja', 'grounding-54321'],
      confidence: confidenceFor(sessions, 'respiracion-478', 0.55),
      safety: false,
      safety_message: null,
    };
  }

  // 4. Sueño bajo + energia reducida -> recuperacion
  if (sleep_hours !== null && sleep_hours < 6 && energy <= 4) {
    return {
      intervention_slug: 'relajacion-progresiva',
      reason: 'Noche corta con energía reducida; una relajación puede favorecer la recuperación',
      evidence,
      alternatives: ['respiracion-caja', 'atencion-plena-minuto'],
      confidence: confidenceFor(sessions, 'relajacion-progresiva', 0.6),
      safety: false,
      safety_message: null,
    };
  }

  // 5. Energia baja -> aterrizaje breve
  if (energy <= 3) {
    return {
      intervention_slug: 'grounding-54321',
      reason: 'Energía baja registrada',
      evidence,
      alternatives: ['atencion-plena-minuto', 'respiracion-caja'],
      confidence: confidenceFor(sessions, 'grounding-54321', 0.55),
      safety: false,
      safety_message: null,
    };
  }

  // 6. Concentracion baja -> minuto de atencion plena
  if (concentration <= 3) {
    return {
      intervention_slug: 'atencion-plena-minuto',
      reason: 'Concentración baja registrada',
      evidence,
      alternatives: ['respiracion-caja', 'grounding-54321'],
      confidence: confidenceFor(sessions, 'atencion-plena-minuto', 0.55),
      safety: false,
      safety_message: null,
    };
  }

  // 7. Estado equilibrado -> reflexion
  if (intensity <= 3 && activation <= 4) {
    return {
      intervention_slug: 'pensamiento-cbt',
      reason: 'Estado equilibrado; puede ser buen momento para una reflexión breve',
      evidence,
      alternatives: ['respiracion-caja', 'atencion-plena-minuto'],
      confidence: confidenceFor(sessions, 'pensamiento-cbt', 0.5),
      safety: false,
      safety_message: null,
    };
  }

  // 8. Por defecto
  return {
    intervention_slug: 'respiracion-caja',
    reason: 'Estado intermedio; una pausa breve de respiración',
    evidence,
    alternatives: ['grounding-54321', 'atencion-plena-minuto'],
    confidence: confidenceFor(sessions, 'respiracion-caja', 0.5),
    safety: false,
    safety_message: null,
  };
}

// ============================================
// INSIGHTS V1 (trazables, no repetitivos, sin causalidad)
// ============================================

export interface CheckInForInsight {
  activation: number;
  intensity: number;
  sleep_hours: number | null;
  created_at: string;
}

export interface InsightCandidate {
  insight_key: string;
  title: string;
  body: string;
  evidence: string[];
  observation_count: number;
  confidence: number;
  period_start: string | null;
  period_end: string | null;
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function generateInsightCandidates(
  checkins: CheckInForInsight[],
  sessions: SessionRecord[]
): InsightCandidate[] {
  const candidates: InsightCandidate[] = [];
  const now = new Date();

  // --- 1. Sueño bajo -> mayor activacion ---
  const lowSleep = checkins.filter(c => c.sleep_hours !== null && c.sleep_hours < 6);
  const goodSleep = checkins.filter(c => c.sleep_hours !== null && c.sleep_hours >= 6);
  if (lowSleep.length >= 3 && goodSleep.length >= 3) {
    const avgLow = mean(lowSleep.map(c => c.activation));
    const avgGood = mean(goodSleep.map(c => c.activation));
    const diff = avgLow - avgGood;
    if (diff >= 1) {
      candidates.push({
        insight_key: 'sleep_activation',
        title: 'Sueño y activación',
        body: `En ${lowSleep.length} días con menos de 6h de sueño registraste una activación media de ${fmt(avgLow)} frente a ${fmt(avgGood)} en días con 6h o más (diferencia ${fmt(diff)}). Es una observación de tu historial, no un diagnóstico ni una relación causal demostrada.`,
        evidence: [`low_sleep_checkins=${lowSleep.length}`, `good_sleep_checkins=${goodSleep.length}`, `activation_diff=${fmt(diff)}`],
        observation_count: lowSleep.length + goodSleep.length,
        confidence: Math.min(0.85, 0.5 + diff * 0.1),
        period_start: checkins[checkins.length - 1]?.created_at ?? null,
        period_end: checkins[0]?.created_at ?? null,
      });
    }
  }

  // --- 2. Sesiones de respiracion -> descenso de intensidad ---
  const breathing = sessions.filter(s => s.category === 'breathing' && s.completion === 1);
  if (breathing.length >= 2) {
    const reduced = breathing.filter(s => s.delta < 0).length;
    const avgDelta = mean(breathing.map(s => s.delta));
    if (reduced >= Math.ceil(breathing.length * 0.5)) {
      candidates.push({
        insight_key: 'breathing_reduction',
        title: 'Respiración e intensidad',
        body: `En ${reduced} de ${breathing.length} sesiones de respiración registraste descenso de la intensidad tras la práctica (variación media ${fmt(avgDelta)}). Es una observación de tus registros: no afirma que la respiración cause el cambio.`,
        evidence: [`sessions=${breathing.length}`, `with_reduction=${reduced}`, `avg_delta=${fmt(avgDelta)}`],
        observation_count: breathing.length,
        confidence: Math.min(0.8, 0.5 + (reduced / breathing.length) * 0.3),
        period_start: sessions[sessions.length - 1]?.created_at ?? null,
        period_end: sessions[0]?.created_at ?? null,
      });
    }
  }

  // --- 3. Sesiones cortas -> mayor tasas de finalizacion ---
  const completed = sessions.filter(s => s.completion === 1);
  const short = completed.filter(s => s.duration_sec !== null && s.duration_sec <= 600);
  if (short.length >= 3) {
    const allShort = sessions.filter(s => s.duration_sec !== null && s.duration_sec <= 600);
    const completionRate = allShort.length > 0 ? short.length / allShort.length : 1;
    if (completionRate >= 0.6) {
      candidates.push({
        insight_key: 'short_sessions',
        title: 'Sesiones breves',
        body: `Has completado la mayoría de tus sesiones de menos de 10 minutos (${short.length} de ${allShort.length}). Los resultados pueden variar; es una observación de tu historial.`,
        evidence: [`short_sessions=${short.length}`, `short_total=${allShort.length}`, `completion_rate=${fmt(completionRate * 100)}%`],
        observation_count: allShort.length,
        confidence: Math.min(0.7, 0.5 + completionRate * 0.15),
        period_start: sessions[sessions.length - 1]?.created_at ?? null,
        period_end: sessions[0]?.created_at ?? null,
      });
    }
  }

  void now;
  return candidates;
}

// ============================================
// STREAK / RESUMEN
// ============================================

function shiftDay(isoDay: string, offset: number): string {
  const d = new Date(isoDay + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(createdAts: string[]): { streak: number; dayCount: number } {
  const days = new Set(createdAts.map(a => (a || '').slice(0, 10)).filter(Boolean));
  let cursor = new Date().toISOString().slice(0, 10);
  if (!days.has(cursor)) cursor = shiftDay(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return { streak, dayCount: days.size };
}