// Plantillas estructuradas de marketing clinico.
// El modelo LLM SOLO rellena dentro del marco definido aqui; no genera libremente.
// Todo contenido resultante debe pasar por validateClinicalContent antes de publicarse.

export const CLINIC_CONTEXT = `Eres el asistente de marketing de una clinica de salud mental especializada en Terapia
Magnetica Transcraneal (TMS) y atencion psicologica en Xiutetelco, Puebla, Mexico.

REGLAS OBLIGATORIAS:
1. NUNCA prometas curacion, garantias de resultado, "100%", "elimina", "sin efectos secundarios".
2. NUNCA inventes datos cientificos ni cifras de eficacia sin evidencia.
3. SIEMPRE incluye que se requiere una valoracion profesional previa.
4. Usa lenguaje claro, respetuoso y sin estigmatizar la salud mental.
5. Habla en espanol de Mexico, tono empatico y profesional.
6. No diagnostiques ni trates a ningun paciente por este medio.
7. Evita generalizaciones absolutas ("todos", "siempre", "ningun paciente").
8. NUNCA incluyas datos personales, nombres, telefonos ni historial de pacientes.
9. Si algo requiere conocimiento medico, recomienda valoracion presencial.
10. Responde SOLO JSON valido, sin texto adicional ni code fences.`;

export interface ContentPromptInput {
  type: 'blog' | 'social' | 'email' | 'whatsapp';
  topic: string;
  audience: string;
  goal: string;
  length: 'corto' | 'medio' | 'extenso';
  callToAction: string;
}

export function buildContentPrompt(input: ContentPromptInput): string {
  return `${CLINIC_CONTEXT}

Genera contenido de marketing del tipo "${input.type}" con las siguientes caracteristicas:

- TEMA: ${input.topic}
- AUDIENCIA: ${input.audience}
- OBJETIVO: ${input.goal}
- EXTENSION: ${input.length}
- LLAMADO A LA ACCION (CTA): ${input.callToAction}

Responde con un objeto JSON con esta estructura exacta:
{
  "headline": "titulo atractivo y honesto",
  "body": "cuerpo del contenido (sin promesas medicas)",
  "cta": "llamado a la accion",
  "hashtags": ["tag1", "tag2"],
  "notes": "notas editoriales o de cumplimiento"
}`;
}

export interface CampaignPromptInput {
  name: string;
  audience: string;
  budget: number;
  channels: string[];
  durationDays: number;
  goal: string;
}

export function buildCampaignPrompt(input: CampaignPromptInput): string {
  return `${CLINIC_CONTEXT}

Genera una campana de marketing con estas caracteristicas:

- NOMBRE: ${input.name}
- AUDIENCIA OBJETIVO: ${input.audience}
- PRESUPUESTO SUGERIDO: ${input.budget} MXN
- CANALES: ${input.channels.join(', ')}
- DURACION: ${input.durationDays} dias
- OBJETIVO: ${input.goal}

Responde con un objeto JSON con esta estructura exacta:
{
  "summary": "resumen ejecutivo de la campana",
  "audience_segments": ["segmento1", "segmento2"],
  "budget_allocation": { "canal": "monto en MXN" },
  "channels": ["canal1"],
  "creative_concepts": ["concepto1", "concepto2"],
  "copy": "texto principal de la campana",
  "cta": "llamado a la accion",
  "expected_metrics": { "impressions": 0, "clicks": 0, "conversions": 0 },
  "timeline": { "fase": "descripcion" }
}`;
}

export interface SeoPromptInput {
  keyword: string;
  searchIntent: 'informativo' | 'comercial' | 'navegacional' | 'transaccional';
  competition: 'baja' | 'media' | 'alta';
  audience: string;
}

export function buildSeoPrompt(input: SeoPromptInput): string {
  return `${CLINIC_CONTEXT}

Genera una analisis SEO para la palabra clave "${input.keyword}":

- INTENCION DE BUSQUEDA: ${input.searchIntent}
- COMPETENCIA ESTIMADA: ${input.competition}
- AUDIENCIA: ${input.audience}

Responde con un objeto JSON con esta estructura exacta:
{
  "keyword": "${input.keyword}",
  "search_intent": "descripcion",
  "difficulty": 0,
  "volume_estimate": 0,
  "meta_title": "titulo meta (max 60 caracteres)",
  "meta_description": "descripcion meta (max 160 caracteres)",
  "schema_type": "tipo de schema.org sugerido",
  "content_outline": ["seccion1", "seccion2"],
  "related_keywords": ["kw1", "kw2"],
  "recommendations": ["recomendacion1", "recomendacion2"]
}`;
}
