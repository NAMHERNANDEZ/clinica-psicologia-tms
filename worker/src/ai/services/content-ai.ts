import type { Env } from '../../types';
import { generateWithGemini, extractJsonObject } from '../providers/gemini';
import { buildContentPrompt, type ContentPromptInput } from '../prompts/marketing';
import { validateClinicalContent, type ValidationResult } from '../validators/clinical-validator';

export interface ContentOutput {
  headline: string;
  body: string;
  cta: string;
  hashtags: string[];
  notes: string;
}

export interface ContentGenerationResult {
  content: ContentOutput;
  validation: ValidationResult;
  model: string | null;
  source: 'gemini' | 'template';
}

// Fallback determinista basado en plantilla (80% de la logica editorial).
// Se usa cuando la API no esta configurada o falla. NUNCA contiene promesas clinicas.
function templateContent(input: ContentPromptInput): ContentOutput {
  const audience = input.audience || 'personas interesadas en el bienestar emocional';
  const topic = input.topic || 'salud mental y bienestar';
  const goal = input.goal || 'informar sobre la TMS';
  const cta = input.callToAction || 'Solicita una valoracion profesional';

  const headline = `${topic.charAt(0).toUpperCase() + topic.slice(1)}: lo que deberias saber`;
  const body =
    `En nuestra clinica acompanamos a ${audience} que desean conocer mas sobre ${topic}. ` +
    `Nuestro objetivo es ${goal}. Trabajamos con Terapia Magnetica Transcraneal (TMS) y atencion psicologica. ` +
    `Cada caso es diferente, por eso es importante realizar una valoracion profesional previa para determinar ` +
    `si esta opcion es adecuada para cada persona.`;
  const hashtags = ['#SaludMental', '#Bienestar', '#TMS', '#Psicologia'];

  return {
    headline,
    body,
    cta,
    hashtags,
    notes: 'Contenido generado por plantilla. No contiene promesas clinicas. Revisar antes de publicar.',
  };
}

export async function generateContent(env: Env, input: ContentPromptInput): Promise<ContentGenerationResult> {
  let content: ContentOutput = templateContent(input);
  let model: string | null = null;
  let source: 'gemini' | 'template' = 'template';

  const result = await generateWithGemini(env, { prompt: buildContentPrompt(input), temperature: 0.7 });
  if (result) {
    const parsed = extractJsonObject<ContentOutput>(result.text);
    if (parsed && parsed.headline && parsed.body) {
      content = {
        headline: parsed.headline,
        body: parsed.body,
        cta: parsed.cta || input.callToAction || 'Solicita una valoracion profesional',
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        notes: parsed.notes || '',
      };
      model = result.model;
      source = 'gemini';
    }
  }

  const validation = validateClinicalContent(`${content.headline}\n${content.body}`);

  return { content, validation, model, source };
}
