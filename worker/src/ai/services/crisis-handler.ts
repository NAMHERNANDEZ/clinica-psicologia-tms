// PROTOCOLO DE CRISIS — respuesta determinista, empática, breve, conversacional
// NO debe depender de LLM. NO debe incluir "Línea de la Vida".

import { assessSafety } from './safety-router';

// Gate server-side ÚNICO: usar ANTES de booking/Calendar/LLM/secretary en
// /api/chat, /api/voice/chat (y cualquier transcript STT). Si crisis, la
// respuesta es determinista (nunca slots, nunca pricing, nunca burbuja vacía).
export function crisisGate(text: string): { crisis: true; message: string } | { crisis: false } {
  let safety;
  try {
    safety = assessSafety(text || '');
  } catch {
    return { crisis: false };
  }
  if (safety.level !== 'EMERGENCIA') return { crisis: false };
  return {
    crisis: true,
    message: buildCrisisResponse({
      level: safety.level,
      reason: safety.reason,
      trigger_words: safety.trigger_words,
      recommended_action: safety.recommended_action,
      requires_professional_escalation: safety.requires_professional_escalation,
    }).message,
  };
}

export function buildCrisisResponse(safety: { level: string; reason: string; trigger_words: string[]; recommended_action: string; requires_professional_escalation: boolean }): { message: string; intent: string; confidence: number; action: string; crisisResources: string[] | undefined; safety: any; memoryRegistered: boolean } {
  const isEmergency = safety.level === 'EMERGENCIA';
  // RESPUESTA HUMANA PRIMERO — empatía, calidez, pregunta de seguridad, continúa la conversación
  const empathetic = isEmergency
    ? 'Siento que estás pasando por algo muy doloroso. Estoy aquí contigo. Quiero asegurarme de que estés a salvo ahora mismo: ¿estás en peligro de hacerte daño en este momento?'
    : 'Entiendo que estás atravesando una situación muy difícil. Estoy aquí contigo. ¿Estás en riesgo inmediato de hacerte daño ahora?';

  return {
    message: empathetic,
    intent: 'emergency',
    confidence: 1.0,
    action: isEmergency ? 'transfer_human' : 'transfer_human',
    crisisResources: undefined,
    safety,
    memoryRegistered: true,
  };
}