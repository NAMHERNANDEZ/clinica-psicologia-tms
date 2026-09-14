// SAFETY ROUTER — Capa de seguridad para cada mensaje del chat terapéutico
// Clasifica los mensajes antes de generar respuesta.

export type SafetyLevel = 'NORMAL' | 'EMOCIONAL' | 'ALTO_RIESGO' | 'CRISIS' | 'EMERGENCIA';

export interface SafetyAssessment {
  level: SafetyLevel;
  reason: string;
  trigger_words: string[];
  recommended_action: 'continue' | 'emotional_support' | 'risk_protocol' | 'crisis_protocol' | 'emergency_protocol';
  requires_professional_escalation: boolean;
}

function normSafety(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Emergencia = ideación/autolesión explícita. Lista tolerante a errores de
// escritura (mayúsculas, tildes, signos, palabras pegadas como "kme").
// OJO: NO incluye 'emergencia'/'crisis' sueltos (son preguntas de info).
const EMERGENCY_PHRASES = [
  'me quiero matar', 'quiero matar', 'quiero matarme', 'me voy a matar', 'me matare',
  'quiero suicidarme', 'me quiero suicidar', 'me voy a suicidar', 'voy a suicidarme',
  'suicidio', 'suicida', 'suicidarme', 'suicidar',
  'quitarme la vida', 'quitarme del medio',
  'ya no quiero vivir', 'no quiero vivir', 'no quiero seguir viviendo',
  'quiero morir', 'quiero morirme', 'me quiero morir',
  'acabar con todo', 'acabar con mi vida', 'terminar con todo', 'terminar con mi vida',
  'hacerme daño', 'me hago daño', 'hacer daño a mi mismo', 'lastimarme',
  'cortarme', 'cortar mis venas', 'autolesion', 'autolesionarme',
  'matarme', 'matar me',
];
// Misma intención sin espacios ("mequieromatar", "kmequieromatar").
const EMERGENCY_COMPACT = [
  'quieromatar', 'quieromorir', 'quierosuicid', 'suicid', 'matarme',
  'noquierovivir', 'yanoquierovivir', 'noquieroseguirviviendo', 'acabarcontodo',
  'hacermedano', 'cortarme', 'quitarmelavida',
];

// Gate determinista server-side: true SOLO ante emergencia explícita.
// Usado por /api/chat, /api/voice/chat y secretary ANTES de booking/LLM.
export function isEmergency(text: string): boolean {
  if (!text) return false;
  const t = ` ${normSafety(text)} `;
  for (const p of EMERGENCY_PHRASES) {
    if (t.includes(` ${p} `) || t.includes(` ${p}s `)) return true;
  }
  const compact = t.replace(/\s+/g, '');
  for (const p of EMERGENCY_COMPACT) {
    if (compact.includes(p)) return true;
  }
  return false;
}

const EMERGENCY_KEYWORDS = [
  'me voy a matar', 'me quiero matar', 'quiero matarme', 'quiero suicidarme', 'me voy a suicidar',
  'suicidarme', 'suicidio', 'quitarme la vida', 'quiero quitarme la vida', 'quiero hacermec daño',
  'no quiero vivir', 'me voy a quitar la vida', 'acabar con todo', 'morirme', 'autolesion',
  'no quiero vivir', 'me voy a quitar la vida', 'acabar con todo', 'morirme', 'autolesion',
  'autolesión', 'cortar', 'cortarme', 'dañarme', 'morir', 'muero', 'muerta', 'muerto',
  'despedirme', 'adios', 'adiós', 'no aguanto más', 'no aguanto mas', 'no puedo seguir',
  'me voy', 'me voy de este mundo', 'terminar con todo', 'terminar con mi vida',
];

const CRISIS_KEYWORDS = [
  'desesperación', 'desesperado', 'desesperada', 'crisis', 'pánico', 'ataque de pánico',
  'no puedo respirar', 'no respiro', 'me ahogo', 'ahogándome', 'me muero', 'muero de',
  'ataque', 'no aguanto', 'no aguanto mas', 'no puedo más', 'no puedo mas',
  'me siento muy mal', 'no tengo fuerzas', 'no tengo ganas de nada', 'nada importa',
  'todo es inútil', 'inútil', 'sin sentido', 'sin esperanza', 'desesperanza',
];

const HIGH_RISK_KEYWORDS = [
  'depresión', 'triste', 'tristeza', 'deprimido', 'deprimida', 'deprimirme', 'bajo',
  'baja', 'ansiedad', 'ansioso', 'ansiosa', 'miedo', 'miedoso', 'miedosa', 'temor',
  'preocupación', 'preocupado', 'estresado', 'estres', 'estresada', 'sobrecargado',
  'angustia', 'angustiado', 'angustiada', 'dolor', 'dolor emocional', 'sufrimiento',
];

const EMOTIONAL_KEYWORDS = [
  'triste', 'feliz', 'alegre', 'enfadado', 'enojado', 'enojada', 'asustado', 'asustada',
  'preocupado', 'preocupada', 'emocionado', 'emocionada', 'ansioso', 'relajado', 'calmado',
];

export function assessSafety(message: string): SafetyAssessment {
  // Tier-1 tolerante (tildes, mayúsculas, typos): precede al literal.
  if (isEmergency(message)) {
    return {
      level: 'EMERGENCIA',
      reason: 'Detectado lenguaje de autolesión/suicidio (normalizado)',
      trigger_words: ['emergency-normalized'],
      recommended_action: 'emergency_protocol',
      requires_professional_escalation: true,
    };
  }
  const lowerMessage = message.toLowerCase();

  // EMERGENCIA: palabras clave directas de autolesión o suicidio
  const emergencyTriggers = EMERGENCY_KEYWORDS.filter(w => lowerMessage.includes(w));
  if (emergencyTriggers.length > 0) {
    return {
      level: 'EMERGENCIA',
      reason: `Detectado lenguaje de autolesión/suicidio: ${emergencyTriggers.join(', ')}`,
      trigger_words: emergencyTriggers,
      recommended_action: 'emergency_protocol',
      requires_professional_escalation: true,
    };
  }

  // CRISIS: palabras de crisis o pánico
  const crisisTriggers = CRISIS_KEYWORDS.filter(w => lowerMessage.includes(w));
  if (crisisTriggers.length > 0) {
    return {
      level: 'CRISIS',
      reason: `Detectado lenguaje de crisis/pánico: ${crisisTriggers.join(', ')}`,
      trigger_words: crisisTriggers,
      recommended_action: 'crisis_protocol',
      requires_professional_escalation: true,
    };
  }

  // ALTO RIESGO: síntomas severos de depresión, ansiedad, angustia
  const highRiskTriggers = HIGH_RISK_KEYWORDS.filter(w => lowerMessage.includes(w));
  if (highRiskTriggers.length > 0) {
    return {
      level: 'ALTO_RIESGO',
      reason: `Detectado lenguaje de alto riesgo emocional: ${highRiskTriggers.join(', ')}`,
      trigger_words: highRiskTriggers,
      recommended_action: 'risk_protocol',
      requires_professional_escalation: true,
    };
  }

  // EMOCIONAL: emociones expresadas sin riesgo inmediato
  const emotionalTriggers = EMOTIONAL_KEYWORDS.filter(w => lowerMessage.includes(w));
  if (emotionalTriggers.length > 0) {
    return {
      level: 'EMOCIONAL',
      reason: `Detectado lenguaje emocional: ${emotionalTriggers.join(', ')}`,
      trigger_words: emotionalTriggers,
      recommended_action: 'emotional_support',
      requires_professional_escalation: false,
    };
  }

  // NORMAL
  return {
    level: 'NORMAL',
    reason: 'Sin indicadores de riesgo detectados',
    trigger_words: [],
    recommended_action: 'continue',
    requires_professional_escalation: false,
  };
}
