// ============================================
// CBT SERVICE — MH-EXPANSION 1.2
// Mapper + therapeutic-engine integration + context builder + safety gate
// Reutiliza mh_interventions y motor before/after existente.
// ============================================

import { computeDelta } from './service';
import type { CbtStrategy } from './cbt-validators';

// ---------- SAFETY GATE ----------
const SAFETY_MESSAGE =
  'Has registrado una intensidad muy alta. Esto es un aviso de tu registro, no un diagnóstico. ' +
  'Si sientes que podrías dañarte, busca ayuda inmediata: 911 o Línea de la Vida 800 911 2000.';

// Crisis si before_score >=9 o emotion_intensity >=9 o check-in subyacente con intensidad >=9
export function checkCrisisGate(before_score: number | null, emotion_intensity: number | null, checkinIntensity?: number | null): { crisis: boolean; message: string | null } {
  if ((before_score !== null && before_score >= 9) || (emotion_intensity !== null && emotion_intensity >= 9) || (checkinIntensity !== null && checkinIntensity !== undefined && checkinIntensity >= 9)) {
    return { crisis: true, message: SAFETY_MESSAGE };
  }
  return { crisis: false, message: null };
}

// ---------- STRATEGY MAPPER ----------
// No inventa intervenciones: traduce formulación a slugs existentes.
// Catálogo existente: respiracion-478, respiracion-caja, grounding-54321, atencion-plena-minuto, relajacion-progresiva, pensamiento-cbt
export interface FormulationSnapshot {
  situation?: string | null;
  automatic_thought?: string | null;
  emotion?: string | null;
  emotion_intensity?: number | null;
  behavior?: string | null;
  evidence_for?: string | null;
  evidence_against?: string | null;
  before_score?: number | null;
  // context adicional: sleep, activation, etc. via context_json
  context_json?: string | null;
}

export interface StrategyDecision {
  selected_strategy: CbtStrategy;
  intervention_slug: string;
  reason: string;
  alternatives: string[];
  confidence: number;
  disclaimer: string;
}

const DISCLAIMER = 'Esta formulación es una herramienta de bienestar; no constituye diagnóstico clínico.';

export function mapFormulationToStrategy(f: FormulationSnapshot): StrategyDecision {
  const thought = (f.automatic_thought || '').toLowerCase();
  const situation = (f.situation || '').toLowerCase();
  const behavior = (f.behavior || '').toLowerCase();
  const emotion = (f.emotion || '').toLowerCase();

  // Heurísticas deterministas, trazables
  // 1. Pensamiento catastrófico / rumiación → reestructuración
  if (thought.includes('siempre') || thought.includes('nunca') || thought.includes('fracaso') || thought.includes('inútil') || thought.includes('no puedo') || thought.includes('catástrofe')) {
    return {
      selected_strategy: 'cognitive_restructuring',
      intervention_slug: 'pensamiento-cbt',
      reason: 'Pensamiento automático con distorsión detectada; ejercicio de reestructuración puede ayudar a explorar evidencia',
      alternatives: ['respiracion-caja', 'grounding-54321'],
      confidence: 0.65,
      disclaimer: DISCLAIMER,
    };
  }
  // 2. Evitación / exposición
  if (behavior.includes('evit') || situation.includes('evit') || thought.includes('evitar')) {
    return {
      selected_strategy: 'exposure',
      intervention_slug: 'grounding-54321',
      reason: 'Señales de evitación; técnica de aterrizaje gradual puede ser primer paso',
      alternatives: ['pensamiento-cbt', 'respiracion-caja'],
      confidence: 0.6,
      disclaimer: DISCLAIMER,
    };
  }
  // 3. Activación baja / anhedonia / energía baja → activación conductual -> mindfulness/atención
  if (emotion.includes('triste') || emotion.includes('bajo') || emotion.includes('desmot') || behavior.includes('no hice') || behavior.includes('aisl')) {
    return {
      selected_strategy: 'behavioral_activation',
      intervention_slug: 'atencion-plena-minuto',
      reason: 'Energía o ánimo bajo; una práctica breve de atención puede apoyar el inicio de actividad',
      alternatives: ['relajacion-progresiva', 'pensamiento-cbt'],
      confidence: 0.58,
      disclaimer: DISCLAIMER,
    };
  }
  // 4. Sueño / context_json con sleep <6 → higiene sueño -> relajación
  try {
    if (f.context_json) {
      const ctx = JSON.parse(f.context_json);
      if (ctx.sleep_hours !== undefined && ctx.sleep_hours !== null && Number(ctx.sleep_hours) < 6) {
        return {
          selected_strategy: 'sleep_hygiene',
          intervention_slug: 'relajacion-progresiva',
          reason: 'Sueño corto registrado; relajación puede favorecer descanso',
          alternatives: ['respiracion-478', 'atencion-plena-minuto'],
          confidence: 0.62,
          disclaimer: DISCLAIMER,
        };
      }
      if (ctx.activation !== undefined && Number(ctx.activation) >= 7) {
        return {
          selected_strategy: 'breathing',
          intervention_slug: 'respiracion-caja',
          reason: 'Activación alta en contexto; respiración regulada',
          alternatives: ['respiracion-478', 'grounding-54321'],
          confidence: 0.6,
          disclaimer: DISCLAIMER,
        };
      }
    }
  } catch {}

  // 5. Ansiedad / intensidad alta → breathing/grounding
  if ((f.before_score !== null && f.before_score !== undefined && f.before_score >= 7) || (f.emotion_intensity !== null && f.emotion_intensity !== undefined && f.emotion_intensity >= 7) || emotion.includes('ansied') || emotion.includes('nerv')) {
    const slug = (f.before_score ?? f.emotion_intensity ?? 0) >= 8 ? 'respiracion-478' : 'respiracion-caja';
    return {
      selected_strategy: 'breathing',
      intervention_slug: slug,
      reason: 'Activación/emoción intensa; respiración pautada',
      alternatives: slug === 'respiracion-caja' ? ['respiracion-478', 'grounding-54321'] : ['respiracion-caja', 'grounding-54321'],
      confidence: 0.6,
      disclaimer: DISCLAIMER,
    };
  }

  // 6. Problemas de resolución / preocupación práctica → problem_solving
  if (thought.includes('problema') || thought.includes('decidir') || thought.includes('debo elegir') || situation.includes('trabajo') && thought.includes('qué hacer')) {
    return {
      selected_strategy: 'problem_solving',
      intervention_slug: 'pensamiento-cbt',
      reason: 'Situación con componente de toma de decisiones; explorar alternativas puede ayudar',
      alternatives: ['atencion-plena-minuto', 'grounding-54321'],
      confidence: 0.55,
      disclaimer: DISCLAIMER,
    };
  }

  // 7. Por defecto: reestructuración cognitiva (pensamiento-cbt) es la más versátil CBT
  return {
    selected_strategy: 'cognitive_restructuring',
    intervention_slug: 'pensamiento-cbt',
    reason: 'Contexto intermedio; exploración cognitiva equilibrada',
    alternatives: ['respiracion-caja', 'grounding-54321'],
    confidence: 0.5,
    disclaimer: DISCLAIMER,
  };
}

// ---------- PHASE MACHINE ----------
export const PHASE_ORDER: string[] = ['listen','reflect','validate','explore','formulate','intervene','practice','reevaluate','next_step','closure'];

export function nextPhase(current: string): string | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}
export function isValidTransition(current: string, target: string): boolean {
  const ci = PHASE_ORDER.indexOf(current);
  const ti = PHASE_ORDER.indexOf(target);
  return ci !== -1 && ti !== -1 && ti >= ci; // permite avance o permanecer, no retroceso brusco salvo formulate
}

// ---------- CONTEXT BUILDER ----------
export interface MhContext {
  latestCheckin?: { intensity: number; activation: number; energy: number; concentration: number; sleep_hours: number | null; emotional_state: string } | null;
  recentWellbeing?: Array<{ scale_id: string; score: number; band: string | null }>;
  journalSnippet?: string | null;
}

export function buildCbtContext(mhContext: MhContext): string {
  const parts: string[] = [];
  if (mhContext.latestCheckin) {
    const c = mhContext.latestCheckin;
    parts.push(`checkin intensity=${c.intensity} activation=${c.activation} energy=${c.energy} sleep=${c.sleep_hours}`);
  }
  if (mhContext.recentWellbeing && mhContext.recentWellbeing.length) {
    parts.push(`wellbeing: ${mhContext.recentWellbeing.map(w => `${w.scale_id}:${w.score}`).join(',')}`);
  }
  if (mhContext.journalSnippet) parts.push(`journal: ${mhContext.journalSnippet.slice(0,120)}`);
  return parts.join(' | ') || 'sin contexto previo';
}

// ---------- REEVALUATION ----------
export function computeCbtDelta(before: number, after: number): number {
  return computeDelta(before, after);
}
export function buildCbtInsight(delta: number, before: number, after: number): string {
  if (delta < 0) return `Registraste una reducción de intensidad de ${before}/10 a ${after}/10 tras la práctica. Es una observación de tu registro, no un diagnóstico.`;
  if (delta > 0) return `Registraste un aumento de intensidad de ${before}/10 a ${after}/10. Es una observación de tu registro, no un diagnóstico.`;
  return `Tu intensidad se mantuvo en ${before}/10 tras la práctica. Es una observación de tu registro.`;
}
