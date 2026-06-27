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
  address: '5 de Febrero esq. Benito Juárez, Centro. Xiutetelco',
  hours: 'Lunes a Viernes: 9:00 AM - 7:00 PM, Sábado: 9:00 AM - 3:00 PM',
  services: [
    'Psicoterapia (ansiedad, depresión, trauma)',
    'Estimulación Magnética Transcraneal (EMT/TMS)',
    'Evaluación Psicológica',
    'Terapia Online',
  ],
};

export interface AISecretaryAdapter {
  processMessage(message: string, context?: Record<string, unknown>): Promise<AIResponse>;
}

export class FreeSecretary implements AISecretaryAdapter {
  private config: AISecretaryConfig;

  constructor(config: Partial<AISecretaryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async processMessage(message: string): Promise<AIResponse> {
    const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (this.matchesAny(lower, ['agendar', 'cita', 'appointment', 'reservar', 'booking'])) {
      return {
        action: 'clarify',
        message: `Me gustaría ayudarte a agendar una cita en ${this.config.clinicName}.\n\nPor favor, proporciona:\n1. Nombre completo\n2. Teléfono\n3. Fecha deseada (DD/MM/AAAA)\n4. Hora preferida\n\nO envía un WhatsApp al ${this.config.phone} para atención inmediata.`,
        confidence: 0.9,
        template: 'appointment_request',
      };
    }

    if (this.matchesAny(lower, ['horario', 'hours', 'abren', 'cierran', 'schedule'])) {
      return {
        action: 'respond',
        message: `Nuestros horarios de atención son:\n\n${this.config.hours}\n\n¿Deseas agendar una cita?`,
        confidence: 0.95,
        template: 'hours',
      };
    }

    if (this.matchesAny(lower, ['ubicación', 'dirección', 'location', 'donde', 'mapa', 'address'])) {
      return {
        action: 'respond',
        message: `Estamos ubicados en:\n\n${this.config.address}\n\nTeléfono: ${this.config.phone}\n\n¿Necesitas direcciones específicas?`,
        confidence: 0.95,
        template: 'location',
      };
    }

    if (this.matchesAny(lower, ['servicio', 'services', 'ofrecen', 'qué hacen', 'tratan'])) {
      const servicesList = this.config.services.map((s) => `• ${s}`).join('\n');
      return {
        action: 'respond',
        message: `Ofrecemos los siguientes servicios:\n\n${servicesList}\n\n¿Te interesa algún servicio en particular?`,
        confidence: 0.9,
        template: 'services',
      };
    }

    if (this.matchesAny(lower, ['precio', 'costo', 'price', 'cuánto', 'honorarios'])) {
      return {
        action: 'respond',
        message: `Los costos varían según el servicio. Para información específica sobre precios, por favor contacta al ${this.config.phone} o envía un WhatsApp.`,
        confidence: 0.85,
        template: 'pricing',
      };
    }

    if (this.matchesAny(lower, ['emt', 'tms', 'estimulación magnética', 'transcraneal'])) {
      return {
        action: 'respond',
        message: `La Estimulación Magnética Transcraneal (EMT/TMS) es un tratamiento no invasivo para:\n\n• Depresión resistente\n• Ansiedad\n• TOC\n• Dolor crónico\n\n¿Te gustaría agendar una evaluación?`,
        confidence: 0.9,
        template: 'tms_info',
      };
    }

    if (this.matchesAny(lower, ['hola', 'buenos', 'buenas', 'hello', 'hi', 'hey'])) {
      return {
        action: 'respond',
        message: `¡Hola! Soy la asistente virtual de ${this.config.clinicName}. ¿En qué puedo ayudarte?\n\n• Información sobre servicios\n• Horarios de atención\n• Ubicación\n• Agendar citas`,
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
      message: `Puedo ayudarte con:\n\n• Información sobre servicios\n• Horarios de atención\n• Ubicación\n• Agendar citas\n\n¿En qué puedo ayudarte?`,
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
