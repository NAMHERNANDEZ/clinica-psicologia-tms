// Base de conocimiento clinica para Chat IA
// FASE 11.8 — RAG simplificado: embeddings por keywords + Gemini para respuestas

export interface KnowledgeEntry {
  id: string;
  category: 'services' | 'pricing' | 'location' | 'hours' | 'faq' | 'protocol' | 'consent' | 'emergency';
  keywords: string[];
  question: string;
  answer: string;
  source: string;
}

export const CLINICAL_KNOWLEDGE: KnowledgeEntry[] = [
  // Servicios
  {
    id: 'svc-tms',
    category: 'services',
    keywords: ['tms', 'terapia magnetica', 'transcraneal', 'emt', 'neuromodulacion'],
    question: 'Que es la Terapia Magnetica Transcraneal?',
    answer: 'La Terapia Magnetica Transcraneal (TMS) es una tecnica de neuromodulacion no invasiva que utiliza pulsos magneticos para estimular areas especificicas del cerebro relacionadas con la regulacion emocional y funciones cognitivas. Se utiliza principalmente para el tratamiento de depresion resistente al tratamiento, ansiedad y otros trastornos del animo. Antes de iniciar se realiza una valoracion profesional para determinar si es una opcion adecuada.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'svc-psicologia',
    category: 'services',
    keywords: ['psicologia', 'psicologo', 'terapia psicologica', 'consulta psicologica', 'atencion psicologica'],
    question: 'Que servicios de psicologia ofrecen?',
    answer: 'Brindamos atencion psicologica especializada para personas que presentan dificultades relacionadas con ansiedad, depresion, estrés, trauma, problemas emocionales y regulacion emocional. Cada caso requiere una valoracion individual.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'svc-consulta',
    category: 'services',
    keywords: ['consulta', 'valoracion', 'evaluacion', 'primera cita', 'como empiezo'],
    question: 'Como funciona la primera consulta?',
    answer: 'La primera consulta es una valoracion profesional donde el especialista evaluara tu motivo de consulta, historial clinico y establecera un plan de tratamiento personalizado. No requiere referencia medica previa.',
    source: 'Clinica Neurociencia',
  },
  // Precios
  {
    id: 'price-tms',
    category: 'pricing',
    keywords: ['precio tms', 'costo tms', 'cuanto cuesta tms', 'precio terapia magnetica'],
    question: 'Cuanto cuesta la TMS?',
    answer: 'La sesion de Terapia Magnetica Transcraneal tiene un costo de $1,500 pesos mexicanos por sesion. Para conocer si este tratamiento es adecuado para ti, primero se realiza una valoracion profesional.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'price-psicologia',
    category: 'pricing',
    keywords: ['precio psicologia', 'costo psicologia', 'cuanto cuesta psicologia', 'precio consulta'],
    question: 'Cuanto cuesta una sesion de psicologia?',
    answer: 'La sesion de psicologia tiene un costo de $500 pesos mexicanos por sesion. Durante la consulta se realiza una valoracion del motivo de atencion y se establece un plan de trabajo.',
    source: 'Clinica Neurociencia',
  },
  // Ubicacion
  {
    id: 'location',
    category: 'location',
    keywords: ['ubicacion', 'direccion', 'donde', 'mapa', 'como llego'],
    question: 'Donde se encuentra la clinica?',
    answer: 'Nuestra clinica se encuentra ubicada en: 5 de Febrero esquina con Benito Juarez, Xiutetelco Centro, Puebla. Atendemos con cita previa para brindar una atencion personalizada.',
    source: 'Clinica Neurociencia',
  },
  // Horarios
  {
    id: 'hours',
    category: 'hours',
    keywords: ['horario', 'hora', 'abren', 'cierran', 'schedule', 'horarios'],
    question: 'Cuales son los horarios de atencion?',
    answer: 'Nuestros horarios de atencion son:\n\nLunes a Viernes: 9:00 AM - 7:00 PM\nSabado: 9:00 AM - 3:00 PM\n\nAtendemos con cita previa para brindar una atencion personalizada.',
    source: 'Clinica Neurociencia',
  },
  // FAQ
  {
    id: 'faq-tms-efectos',
    category: 'faq',
    keywords: ['efectos secundarios', 'efectos adversos', 'hace dano', 'es peligroso', 'molestias'],
    question: 'Tiene efectos secundarios la TMS?',
    answer: 'La Terapia Magnetica Transcraneal generalmente es bien tolerada. Algunas molestias posibles pueden ser: sensacion de estimulacion en el cuero cabelludo, molestia temporal durante la sesion, sensibilidad en la zona tratada, leve dolor de cabeza despues de la sesion. Estas molestias suelen ser temporales.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'faq-tms-sesiones',
    category: 'faq',
    keywords: ['cuantas sesiones', 'numero de sesiones', 'cuanto dura', 'duracion tratamiento'],
    question: 'Cuantas sesiones de TMS necesito?',
    answer: 'El numero de sesiones depende de cada persona y de la valoracion profesional. Durante la evaluacion se establece un plan personalizado segun las necesidades del paciente.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'faq-tms-medicamentos',
    category: 'faq',
    keywords: ['mejor que medicamentos', 'sin medicamentos', 'medicamentos no funcionan', 'resistente'],
    question: 'La TMS es mejor que los medicamentos?',
    answer: 'La Terapia Magnetica Transcraneal puede ser una alternativa especialmente efectiva para algunas personas, principalmente en casos donde los medicamentos no han producido la mejoría esperada. Los resultados pueden variar segun cada persona, diagnostico, antecedentes y protocolo utilizado.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'faq-urgencia',
    category: 'emergency',
    keywords: ['urgencia', 'emergencia', 'crisis', 'suicidio', 'hacerme dano', 'no quiero vivir'],
    question: 'Que hago si estoy en una emergencia?',
    answer: 'Si estas en una emergencia o experimentando una crisis, por favor contacta de inmediato:\n\n- Linea de la Vida: 800 911 2000\n- Servicios de emergencia: 911\n- Acude a tu servico de urgencias mas cercano\n\nTu seguridad es lo mas importante. No estamos autorizados para atender emergencias. Por favor busca ayuda profesional de inmediato.',
    source: 'Clinica Neurociencia',
  },
  {
    id: 'faq-contacto',
    category: 'faq',
    keywords: ['telefono', 'contacto', 'whatsapp', 'como me comunico', 'cita'],
    question: 'Como puedo contactarlos?',
    answer: 'Puedes contactarnos por:\n\nTelefono/WhatsApp: +52 231 144 2941\nDireccion: 5 de Febrero esquina con Benito Juarez, Xiutetelco Centro\nHorario: Lunes a Viernes 9:00 AM - 7:00 PM, Sabado 9:00 AM - 3:00 PM\n\nTambien puedes dejarnos tus datos y un especialista se pondra en contacto contigo.',
    source: 'Clinica Neurociencia',
  },
];

// Busqueda por relevancia (simple keyword matching)
export function searchKnowledge(query: string, limit: number = 3): KnowledgeEntry[] {
  const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const scored = CLINICAL_KNOWLEDGE.map(entry => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (normalized.includes(kw)) score += 10;
    }
    // Bonus for exact phrase match
    if (normalized.includes(entry.question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) score += 20;
    return { entry, score };
  })
  .filter(s => s.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);

  return scored.map(s => s.entry);
}

// Detectar intencion del usuario
export type UserIntent = 'greeting' | 'pricing' | 'services' | 'appointment' | 'location' | 'hours' | 'emergency' | 'faq' | 'unknown';

export function detectIntent(message: string): UserIntent {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/hola|buenos|buenas|hello|hi|hey/.test(lower)) return 'greeting';
  if (/precio|costo|cuanto|cuánto|honorario/.test(lower)) return 'pricing';
  if (/servicio|tratan|ofrecen|que hacen|emt|tms|psicolog/.test(lower)) return 'services';
  if (/cita|agendar|reservar|appointment|booking|quiero una cita/.test(lower)) return 'appointment';
  if (/ubicacion|direccion|donde|mapa|llego/.test(lower)) return 'location';
  if (/horario|hora|abren|cierran|schedule/.test(lower)) return 'hours';
  if (/urgencia|emergencia|crisis|suicidio|hacerme dano|no quiero vivir|quitarme la vida|matarme|acabar con mi vida|dejar de vivir/.test(lower)) return 'emergency';
  if (/que es|como funciona|informacion|beneficio|ventaja|efecto/.test(lower)) return 'faq';
  return 'unknown';
}

// Extraer datos de contacto del mensaje
export interface ExtractedContact {
  nombre?: string;
  telefono?: string;
  email?: string;
  edad?: number;
  servicio?: string;
  motivo?: string;
}

export function extractContactFromMessage(message: string): ExtractedContact {
  const contact: ExtractedContact = {};
  
  // Phone pattern (Mexican format: 10 digits or +52 + 10 digits)
  const phoneMatch = message.match(/(\+?52?\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}|\d{10})/);
  if (phoneMatch) contact.telefono = phoneMatch[1].trim();

  // Email
  const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) contact.email = emailMatch[1];

  // Nombre comun despues de "soy" o "me llamo"
  const nameMatch = message.match(/(?:soy|me llamo|mi nombre es|soy el|soy la)\s+([a-zA-Z\s]{2,30})/i);
  if (nameMatch) contact.nombre = nameMatch[1].trim();

  // Edad
  const ageMatch = message.match(/(\d{1,3})\s*(?:años|years|anio|ann)/i);
  if (ageMatch) contact.edad = parseInt(ageMatch[1]);

  // Servicio
  if (/tms|terapia magnetica|transcraneal/i.test(message)) contact.servicio = 'TMS';
  if (/psicolog|terapia|consulta/i.test(message)) contact.servicio = 'Psicologia';

  // Motivo
  if (/ansiedad|anxiety/i.test(message)) contact.motivo = 'Ansiedad';
  if (/depre|depresion/i.test(message)) contact.motivo = 'Depresion';
  if (/estres|stress/i.test(message)) contact.motivo = 'Estres';
  if (/trauma|ptsd/i.test(message)) contact.motivo = 'Trauma';

  return contact;
}
