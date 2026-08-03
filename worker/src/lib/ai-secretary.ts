export interface AIResponse {
  action: 'respond' | 'clarify' | 'create_appointment' | 'transfer_human';
  message: string;
  confidence: number;
  template?: string;
}

export interface AISecretaryConfig {
  mode: 'free' | 'premium';
  clinicName: string;
  phone: string;
  address: string;
  hours: string;
  services: string[];
}

const DEFAULT_CONFIG: AISecretaryConfig = {
  mode: 'free',
  clinicName: 'Neurociencia Clínica',
  phone: '+52 231 144 2941',
  address: '5 de Febrero esquina con Benito Juárez, Xiutetelco Centro',
  hours: 'Lunes a Viernes: 9:00 AM - 7:00 PM, Sábado: 9:00 AM - 3:00 PM',
  services: [
    'Terapia Magnética Transcraneal (TMS)',
    'Atención psicológica especializada',
  ],
};

export interface AISecretaryAdapter {
  processMessage(message: string, context?: Record<string, unknown>): Promise<AIResponse>;
}

const KNOWLEDGE_BASE: Record<string, { keywords: string[]; action: AIResponse['action']; template: string; confidence: number; message: string }> = {
  identity: {
    keywords: ['quien eres', 'quién eres', 'que eres', 'qué eres', 'tu nombre', 'eres una persona'],
    action: 'respond',
    template: 'identity',
    confidence: 0.95,
    message: `Hola, soy la asistente virtual de **Neurociencia Clínica**.\n\nPuedo ayudarte con información sobre:\n\n• Terapia Magnética Transcraneal (TMS)\n• Terapia psicológica\n• Costos\n• Ubicación\n• Horarios\n• Solicitud de citas\n\nTambién puedo ayudarte a registrar tus datos para que nuestro equipo pueda contactarte.`,
  },
  pricing_tms: {
    keywords: ['cuanto cuesta la tms', 'cuánto cuesta la tms', 'precio tms', 'costo tms', 'precio de la tms', 'costo de la tms'],
    action: 'respond',
    template: 'pricing_tms',
    confidence: 0.95,
    message: `La sesión de Terapia Magnética Transcraneal tiene un costo de:\n\n💰 **$1,500 pesos mexicanos por sesión**\n\nPara conocer si este tratamiento es adecuado para ti, primero se realiza una valoración profesional.`,
  },
  pricing_psicologia: {
    keywords: ['cuanto cuesta una sesion psicologica', 'cuánto cuesta una sesión psicológica', 'precio psicologia', 'costo psicologia', 'sesion psicologica cuesta'],
    action: 'respond',
    template: 'pricing_psicologia',
    confidence: 0.95,
    message: `La sesión de psicología tiene un costo de:\n\n💰 **$500 pesos mexicanos por sesión**\n\nDurante la consulta se realiza una valoración del motivo de atención y se establece un plan de trabajo.`,
  },
  tms_vs_medicamentos: {
    keywords: ['mejor que los medicamentos', 'en vez de medicamentos', 'sin medicamentos', 'medicamentos no funcionan', 'resistente a medicamentos', 'en lugar de pastillas'],
    action: 'respond',
    template: 'tms_vs_medication',
    confidence: 0.9,
    message: `La Terapia Magnética Transcraneal puede ser una alternativa especialmente efectiva para algunas personas, principalmente en casos donde los medicamentos no han producido la mejoría esperada.\n\nEn estudios realizados en pacientes con depresión resistente al tratamiento, la TMS ha mostrado mejores resultados que continuar realizando cambios sucesivos de medicamentos.\n\nAlgunos estudios han reportado:\n\n**TMS:**\n• Respuesta clínica aproximada: **37.5%**\n• Remisión aproximada: **27.1%**\n\n**Tratamiento farmacológico posterior:**\n• Respuesta aproximada: **14.6%**\n• Remisión aproximada: **4.9%**\n\nLos resultados pueden variar según cada persona, diagnóstico, antecedentes y protocolo utilizado.`,
  },
  tms_ventajas: {
    keywords: ['ventajas de la tms', 'beneficios de la tms', 'que ventajas tiene', 'por que elegir tms', 'beneficios tms'],
    action: 'respond',
    template: 'tms_benefits',
    confidence: 0.9,
    message: `Algunas ventajas de la Terapia Magnética Transcraneal son:\n\n✅ Tratamiento no invasivo\n✅ Estimulación dirigida a regiones específicas del cerebro\n✅ No requiere cirugía\n✅ No requiere anestesia en protocolos habituales\n✅ Puede ser una alternativa cuando los medicamentos no han dado la respuesta esperada\n\nAdemás, al no actuar de la misma forma que un medicamento sistémico, puede evitar algunos efectos secundarios asociados a ciertos fármacos.`,
  },
  tms_efectos: {
    keywords: ['efectos secundarios', 'efectos adversos', 'hace dano', 'hace daño', 'es peligroso', 'molestias', 'dolor de cabeza'],
    action: 'respond',
    template: 'tms_side_effects',
    confidence: 0.9,
    message: `La Terapia Magnética Transcraneal generalmente es bien tolerada.\n\nAlgunas molestias posibles pueden ser:\n\n• Sensación de estimulación en el cuero cabelludo\n• Molestia temporal durante la sesión\n• Sensibilidad en la zona tratada\n• **Leve dolor de cabeza después de la sesión**\n\nEstas molestias suelen ser temporales.`,
  },
  tms_sesiones: {
    keywords: ['cuantas sesiones', 'cuántas sesiones', 'numero de sesiones', 'núnero de sesiones', 'cuanto dura el tratamiento', 'cuánto dura el tratamiento', 'duracion del tratamiento'],
    action: 'respond',
    template: 'tms_sessions',
    confidence: 0.85,
    message: `El número de sesiones depende de cada persona y de la valoración profesional.\n\nDurante la evaluación se establece un plan personalizado según las necesidades del paciente.`,
  },
  psicologia_problemas: {
    keywords: ['que problemas atienden', 'qué problemas atienden', 'que atienden', 'problemas emocionales', 'regulacion emocional', 'que trata la psicologia'],
    action: 'respond',
    template: 'psychology_conditions',
    confidence: 0.9,
    message: `Brindamos atención psicológica para personas que presentan dificultades relacionadas con:\n\n• Ansiedad\n• Depresión\n• Estrés\n• Trauma\n• Problemas emocionales\n• Regulación emocional\n\nCada caso requiere una valoración individual.`,
  },
  atencion_presencial: {
    keywords: ['presencial', 'en persona', 'atendemos presencial', 'atencion presencial'],
    action: 'respond',
    template: 'in_person',
    confidence: 0.9,
    message: `Sí, contamos con atención presencial en nuestra clínica ubicada en:\n\n📍 **5 de Febrero esquina con Benito Juárez, Xiutetelco Centro**\n\nTambién podemos orientarte sobre atención en línea según disponibilidad.`,
  },
};

export class FreeSecretary implements AISecretaryAdapter {
  private config: AISecretaryConfig;

  constructor(config: Partial<AISecretaryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async processMessage(message: string): Promise<AIResponse> {
    const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Knowledge base rules (specific first)
    for (const entry of Object.values(KNOWLEDGE_BASE)) {
      if (this.matchesAny(lower, entry.keywords)) {
        return {
          action: entry.action,
          message: entry.message,
          confidence: entry.confidence,
          template: entry.template,
        };
      }
    }

    // Appointment request (capture 6 fields)
    if (this.matchesAny(lower, ['agendar', 'cita', 'appointment', 'reservar', 'booking', 'quiero una cita', 'quiere una cita', 'solicitar cita'])) {
      return {
        action: 'clarify',
        message: `Con gusto podemos ayudarte a solicitar una cita.\n\nPara registrarte necesitamos:\n\n1. Nombre\n2. Edad\n3. Ciudad\n4. Servicio de interés:\n\n   * Terapia Magnética Transcraneal\n   * Psicología\n5. Motivo principal de consulta\n6. Número de contacto\n\nO envía un WhatsApp al ${this.config.phone} para atención inmediata.`,
        confidence: 0.9,
        template: 'appointment_request',
      };
    }

    if (this.matchesAny(lower, ['horario', 'hours', 'abren', 'cierran', 'schedule', 'horarios'])) {
      return {
        action: 'respond',
        message: `Nuestros horarios de atención son:\n\n${this.config.hours}\n\nAtendemos con cita previa para brindar una atención personalizada.\n\n¿Deseas solicitar una cita?`,
        confidence: 0.95,
        template: 'hours',
      };
    }

    if (this.matchesAny(lower, ['ubicación', 'dirección', 'location', 'donde', 'dónde', 'mapa', 'address', 'ubican'])) {
      return {
        action: 'respond',
        message: `Nuestra clínica se encuentra ubicada en:\n\n📍 **5 de Febrero esquina con Benito Juárez**\n📍 **Xiutetelco Centro**\n\nAtendemos con cita previa para brindar una atención personalizada.\n\nSi deseas, puedo ayudarte a solicitar una valoración.`,
        confidence: 0.95,
        template: 'location',
      };
    }

    if (this.matchesAny(lower, ['servicio', 'services', 'ofrecen', 'qué hacen', 'tratan', 'que ofrecen'])) {
      return {
        action: 'respond',
        message: `En ${this.config.clinicName} ofrecemos:\n\n🧠 **Terapia Magnética Transcraneal (TMS)**\n\n🧠 **Atención psicológica especializada**\n\nCada tratamiento inicia con una valoración profesional para conocer las necesidades de cada persona.`,
        confidence: 0.9,
        template: 'services',
      };
    }

    if (this.matchesAny(lower, ['precio', 'costo', 'price', 'cuánto', 'honorarios', 'cuanto', 'cuanto cuesta', 'cuánto cuesta'])) {
      return {
        action: 'respond',
        message: `Nuestros precios son:\n\n💰 **Terapia Magnética Transcraneal (TMS): $1,500 MXN por sesión**\n💰 **Terapia Psicológica: $500 MXN por sesión**\n\nSi deseas, puedo ayudarte a solicitar información para agendar una valoración.`,
        confidence: 0.9,
        template: 'pricing',
      };
    }

    if (this.matchesAny(lower, ['emt', 'tms', 'estimulación magnética', 'transcraneal', 'magnética', 'que es tms', 'qué es tms', 'que es la tms', 'qué es la tms'])) {
      return {
        action: 'respond',
        message: `La Terapia Magnética Transcraneal (TMS) es una técnica de neuromodulación no invasiva que utiliza pulsos magnéticos para estimular áreas específicas del cerebro relacionadas con la regulación emocional y funciones cognitivas.\n\nAntes de iniciar se realiza una valoración profesional para determinar si es una opción adecuada.`,
        confidence: 0.9,
        template: 'tms_info',
      };
    }

    if (this.matchesAny(lower, ['hola', 'buenos', 'buenas', 'hello', 'hi', 'hey'])) {
      return {
        action: 'respond',
        message: `¡Hola! Soy la asistente virtual de **${this.config.clinicName}**.\n\nPuedo ayudarte con información sobre:\n\n• Terapia Magnética Transcraneal (TMS)\n• Terapia psicológica\n• Costos\n• Ubicación\n• Horarios\n• Solicitud de citas\n\nTambién puedo ayudarte a registrar tus datos para que nuestro equipo pueda contactarte.`,
        confidence: 0.95,
        template: 'greeting',
      };
    }

    if (this.matchesAny(lower, ['gracias', 'thank'])) {
      return {
        action: 'respond',
        message: `¡De nada! Si necesitas algo más, no dudes en preguntar. ¿Hay algo más en lo que pueda ayudarte?`,
        confidence: 0.95,
        template: 'thanks',
      };
    }

    return {
      action: 'respond',
      message: `Puedo ayudarte con:\n\n• Información sobre servicios\n• Terapia Magnética Transcraneal (TMS)\n• Costos\n• Horarios de atención\n• Ubicación\n• Solicitud de citas\n\n¿En qué puedo ayudarte?`,
      confidence: 0.5,
      template: 'default',
    };
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }
}

export class PremiumSecretary implements AISecretaryAdapter {
  async processMessage(message: string, context?: Record<string, unknown>): Promise<AIResponse> {
    // Future integration with OpenAI, Claude, or Cloudflare AI
    // For now, fallback to free mode
    const freeSecretary = new FreeSecretary();
    return freeSecretary.processMessage(message);
  }
}

export function createSecretary(mode: 'free' | 'premium' = 'free', config?: Partial<AISecretaryConfig>): AISecretaryAdapter {
  if (mode === 'premium') {
    return new PremiumSecretary();
  }
  return new FreeSecretary(config);
}
