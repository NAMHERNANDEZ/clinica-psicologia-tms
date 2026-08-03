import type { Env } from '../../types';
import { generateWithGemini, extractJsonObject } from '../providers/gemini';
import { buildSeoPrompt, type SeoPromptInput } from '../prompts/marketing';

export interface SeoOutput {
  keyword: string;
  search_intent: string;
  difficulty: number;
  volume_estimate: number;
  meta_title: string;
  meta_description: string;
  schema_type: string;
  content_outline: string[];
  related_keywords: string[];
  recommendations: string[];
}

export interface SeoGenerationResult {
  seo: SeoOutput;
  model: string | null;
  source: 'gemini' | 'template';
}

function templateSeo(input: SeoPromptInput): SeoOutput {
  const keyword = input.keyword || 'terapia magnetica transcraneal';
  const intentText = {
    informativo: 'El usuario busca informacion general sobre el tema',
    comercial: 'El usuario compara opciones de tratamiento',
    navegacional: 'El usuario busca una clinica o marca especifica',
    transaccional: 'El usuario esta listo para agendar o contactar',
  }[input.searchIntent] || 'El usuario busca informacion sobre el tema';

  return {
    keyword,
    search_intent: intentText,
    difficulty: input.competition === 'alta' ? 70 : input.competition === 'media' ? 45 : 25,
    volume_estimate: input.competition === 'alta' ? 1200 : input.competition === 'media' ? 500 : 150,
    meta_title: `${keyword.slice(0, 40)} | Clinica`,
    meta_description: `${keyword.slice(0, 80)}. Valoracion profesional previa. Xiutetelco, Puebla.`,
    schema_type: 'MedicalClinic',
    content_outline: [
      'Que es y como funciona',
      'Para quien puede ser una opcion',
      'Que esperar durante la valoracion',
      'Preguntas frecuentes',
      'Como solicitar una valoracion',
    ],
    related_keywords: ['beneficios de la tms', 'tms para la ansiedad', 'clinica tms puebla', 'tratamiento tms'],
    recommendations: [
      'Incluir siempre la valoracion profesional previa',
      'Optimizar para busqueda local (Xiutetelco, Puebla)',
      'Usar esquema MedicalClinic en la pagina',
      'Evitar promesas medicas en meta descriptions',
    ],
  };
}

export async function generateSeo(env: Env, input: SeoPromptInput): Promise<SeoGenerationResult> {
  let seo: SeoOutput = templateSeo(input);
  let model: string | null = null;
  let source: 'gemini' | 'template' = 'template';

  const result = await generateWithGemini(env, { prompt: buildSeoPrompt(input), temperature: 0.5 });
  if (result) {
    const parsed = extractJsonObject<SeoOutput>(result.text);
    if (parsed && parsed.keyword) {
      seo = {
        keyword: parsed.keyword,
        search_intent: parsed.search_intent || '',
        difficulty: typeof parsed.difficulty === 'number' ? parsed.difficulty : 0,
        volume_estimate: typeof parsed.volume_estimate === 'number' ? parsed.volume_estimate : 0,
        meta_title: parsed.meta_title || '',
        meta_description: parsed.meta_description || '',
        schema_type: parsed.schema_type || 'MedicalClinic',
        content_outline: Array.isArray(parsed.content_outline) ? parsed.content_outline : [],
        related_keywords: Array.isArray(parsed.related_keywords) ? parsed.related_keywords : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
      model = result.model;
      source = 'gemini';
    }
  }

  return { seo, model, source };
}
