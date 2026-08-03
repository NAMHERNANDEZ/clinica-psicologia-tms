export interface ExtractedLead {
  nombre?: string;
  telefono?: string;
  ciudad?: string;
  servicio_interesado?: string;
  motivo?: string;
}

/**
 * Detecta datos de contacto en un mensaje del chat para crear un lead.
 * Es conservador: solo extrae campos cuando encuentra señales claras.
 */
export function extractLeadFromMessage(rawMessage: string): ExtractedLead | null {
  if (!rawMessage || typeof rawMessage !== 'string') return null;
  const text = rawMessage.trim();
  if (text.length === 0) return null;

  const lead: ExtractedLead = {};
  let hasData = false;

  // Teléfono: 10+ dígitos, opcional con espacios/guiones/+52
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{8,}\d)/);
  if (phoneMatch) {
    lead.telefono = phoneMatch[0].trim();
    hasData = true;
  }

  // Nombre: "me llamo X", "mi nombre es X", "soy X"
  const nameMatch = text.match(/(?:me llamo|mi nombre es|soy)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}){0,3})/i);
  if (nameMatch) {
    lead.nombre = nameMatch[1].trim();
    hasData = true;
  }

  // Ciudad: "soy de X", "de la ciudad X", "vivo en X"
  const cityMatch = text.match(/(?:soy de|vivo en|de la ciudad de|de)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]{3,})/i);
  if (cityMatch && !nameMatch) {
    lead.ciudad = cityMatch[1].trim();
    hasData = true;
  }

  // Servicio de interés
  if (/\b(tms|transcraneal|magn[eé]tica|terapia magn[eé]tica)\b/i.test(text)) {
    lead.servicio_interesado = 'TMS';
    hasData = true;
  } else if (/\b(psicolog[ií]a|psicol[oó]gico|terapia psicol[oó]gica|psicoterapia)\b/i.test(text)) {
    lead.servicio_interesado = 'Psicología';
    hasData = true;
  }

  // Motivo: "por X", "porque X", "para X", "ansiedad/depresión/estrés"
  const motivoMatch = text.match(/(?:por|porque|para|con)\s+(ansiedad|depres[ióo]n|estr[eé]s|trauma|tdah|toc|insomnio|p[aá]nico)/i);
  if (motivoMatch) {
    lead.motivo = motivoMatch[1].toLowerCase();
    hasData = true;
  }

  return hasData ? lead : null;
}
