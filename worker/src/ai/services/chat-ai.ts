import type { Env } from '../../types';
import { generateWithGemini, extractJsonObject } from '../providers/gemini';
import { searchKnowledge, detectIntent, extractContactFromMessage, type UserIntent, type ExtractedContact } from '../knowledge/clinical';

export interface ChatContext {
  sessionId?: string;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  leadId?: number;
  patientId?: number;
}

export interface ChatResponse {
  message: string;
  intent: UserIntent;
  confidence: number;
  action: 'respond' | 'clarify' | 'create_appointment' | 'transfer_human' | 'capture_lead';
  contact?: ExtractedContact;
  knowledgeUsed?: string[];
  followUp?: string;
}

const SYSTEM_PROMPT = `Eres la asistente virtual de Neurociencia Clinica, una clinica de salud mental en Xiutetelco, Puebla, Mexico.

REGLAS OBLIGATORIAS:
1. NUNCA prometas curacion, garantias de resultado, "100%", "elimina", "sin efectos secundarios".
2. NUNCA diagnostiques ni trates a ningun paciente por este medio.
3. NUNCA reveles datos personales de otros pacientes.
4. Si mencionan urgencia/emergencia/crisis/suicidio, redirige a Linea de la Vida (800 911 2000) y 911.
5. Usa lenguaje claro, respetuoso y sin estigmatizar la salud mental.
6. Habla en espanol de Mexico, tono empatico y profesional.
7. Si algo requiere conocimiento medico, recomienda valoracion presencial.
8. Responde SOLO JSON valido con la estructura: { "message": "...", "confidence": 0.0-1.0, "action": "...", "followUp": "..." }
9. Nunca generes contenido de mas de 200 palabras.
10. Si no tienes suficiente informacion, pide aclaracion.`;

function buildPrompt(userMessage: string, knowledgeContext: string, chatHistory: string): string {
  return `${SYSTEM_PROMPT}

CONTEXTO DE CONOCIMIENTO:
${knowledgeContext || 'No hay contexto especifico disponible.'}

HISTORIAL DE LA CONVERSACION:
${chatHistory || '(inicio de conversacion)'}

MENSAJE DEL USUARIO:
${userMessage}

Responde con JSON:
{
  "message": "tu respuesta empatica y profesional",
  "confidence": 0.85,
  "action": "respond",
  "followUp": "pregunta de seguimiento opcional"
}`;
}

function getActionFromIntent(intent: UserIntent): ChatResponse['action'] {
  switch (intent) {
    case 'appointment': return 'create_appointment';
    case 'emergency': return 'transfer_human';
    case 'greeting': return 'respond';
    default: return 'respond';
  }
}

function getKnowledgeContext(query: string): string {
  const entries = searchKnowledge(query, 3);
  if (entries.length === 0) return '';
  return entries.map(e => `[${e.category}] ${e.question}: ${e.answer}`).join('\n\n');
}

function getChatHistory(context?: ChatContext): string {
  if (!context?.previousMessages?.length) return '';
  return context.previousMessages
    .slice(-6) // last 6 messages for context
    .map(m => `${m.role === 'user' ? 'Paciente' : 'Asistente'}: ${m.content}`)
    .join('\n');
}

export async function processClinicalChat(
  env: Env,
  userMessage: string,
  context?: ChatContext
): Promise<ChatResponse> {
  const intent = detectIntent(userMessage);
  const contact = extractContactFromMessage(userMessage);
  const knowledgeContext = getKnowledgeContext(userMessage);
  const chatHistory = getChatHistory(context);

  // Emergency always returns immediately
  if (intent === 'emergency') {
    return {
      message: 'Entiendo que es una situacion dificil. Tu seguridad es lo mas importante. Por favor contacta de inmediato:\n\nLinea de la Vida: 800 911 2000\nServicios de emergencia: 911\n\nNo estamos autorizados para atender emergencias. Por favor busca ayuda profesional de inmediato.',
      intent: 'emergency',
      confidence: 1.0,
      action: 'transfer_human',
    };
  }

  // Try Gemini first
  const geminiResult = await generateWithGemini(env, {
    prompt: buildPrompt(userMessage, knowledgeContext, chatHistory),
    system: SYSTEM_PROMPT,
    temperature: 0.6,
    maxOutputTokens: 512,
  });

  if (geminiResult) {
    const parsed = extractJsonObject<ChatResponse>(geminiResult.text);
    if (parsed && parsed.message) {
      return {
        message: parsed.message,
        intent,
        confidence: parsed.confidence || 0.8,
        action: parsed.action || getActionFromIntent(intent),
        contact: Object.keys(contact).length > 0 ? contact : undefined,
        knowledgeUsed: searchKnowledge(userMessage, 2).map(e => e.id),
        followUp: parsed.followUp,
      };
    }
  }

  // Fallback to knowledge base + template
  return fallbackResponse(userMessage, intent, contact);
}

function fallbackResponse(message: string, intent: UserIntent, contact: ExtractedContact): ChatResponse {
  const entries = searchKnowledge(message, 2);
  
  let responseMessage = '';
  let confidence = 0.7;
  let followUp: string | undefined;

  if (entries.length > 0) {
    responseMessage = entries[0].answer;
    confidence = 0.8;
    followUp = 'Deseas agendar una valoracion profesional para conocer mas?';
  } else {
    switch (intent) {
      case 'greeting':
        responseMessage = 'Hola! Soy la asistente virtual de Neurociencia Clinica. Puedo ayudarte con informacion sobre:\n\n- Terapia Magnetica Transcraneal (TMS)\n- Terapia psicologica\n- Costos\n- Horarios\n- Solicitud de citas\n\nEn que puedo ayudarte?';
        followUp = 'Te gustaria conocer nuestros servicios o agendar una valoracion?';
        break;
      case 'pricing':
        responseMessage = 'Nuestros precios son:\n\nTMS: $1,500 MXN por sesion\nPsicologia: $500 MXN por sesion\n\nCada caso requiere una valoracion profesional previa para determinar el plan de tratamiento adecuado.';
        followUp = 'Te gustaria agendar una valoracion?';
        break;
      case 'location':
        responseMessage = 'Nuestra clinica se encuentra en:\n\n5 de Febrero esquina con Benito Juarez\nXiutetelco Centro, Puebla\n\nAtendemos con cita previa.';
        followUp = 'Necesitas indicaciones para llegar?';
        break;
      case 'hours':
        responseMessage = 'Horarios de atencion:\n\nLunes a Viernes: 9:00 AM - 7:00 PM\nSabado: 9:00 AM - 3:00 PM\n\nAtendemos con cita previa.';
        followUp = 'Te gustaria agendar una cita?';
        break;
      case 'appointment':
        responseMessage = 'Con gusto te ayudo a solicitar una cita. Para registrarte necesito:\n\n1. Nombre completo\n2. Edad\n3. Numero de contacto\n4. Servicio de interes (TMS o Psicologia)\n5. Motivo principal de consulta\n\nPuedes enviarme estos datos?';
        confidence = 0.9;
        break;
      case 'services':
        responseMessage = 'En Neurociencia Clinica ofrecemos:\n\n1. Terapia Magnetica Transcraneal (TMS) - neuromodulacion no invasiva\n2. Atencion psicologica especializada\n\nCada tratamiento inicia con una valoracion profesional.';
        followUp = 'Te gustaria conocer mas sobre algun servicio especifico?';
        break;
      default:
        responseMessage = 'Puedo ayudarte con:\n\n- Informacion sobre servicios\n- TMS y psicologia\n- Costos y horarios\n- Solicitud de citas\n\nEn que puedo ayudarte?';
        followUp = 'Te gustaria agendar una valoracion?';
    }
  }

  return {
    message: responseMessage,
    intent,
    confidence,
    action: getActionFromIntent(intent),
    contact: Object.keys(contact).length > 0 ? contact : undefined,
    knowledgeUsed: entries.map(e => e.id),
    followUp,
  };
}
