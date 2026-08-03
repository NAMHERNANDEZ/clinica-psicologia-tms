import type { Env } from '../../types';
import { generateWithGemini, extractJsonObject } from '../providers/gemini';
import { buildCampaignPrompt, type CampaignPromptInput } from '../prompts/marketing';
import { validateClinicalContent, type ValidationResult } from '../validators/clinical-validator';

export interface CampaignOutput {
  summary: string;
  audience_segments: string[];
  budget_allocation: Record<string, number>;
  channels: string[];
  creative_concepts: string[];
  copy: string;
  cta: string;
  expected_metrics: { impressions: number; clicks: number; conversions: number };
  timeline: Record<string, string>;
}

export interface CampaignGenerationResult {
  campaign: CampaignOutput;
  validation: ValidationResult;
  model: string | null;
  source: 'gemini' | 'template';
}

function templateCampaign(input: CampaignPromptInput): CampaignOutput {
  const budget = input.budget || 1000;
  const channels = input.channels?.length ? input.channels : ['instagram', 'whatsapp'];
  const allocation: Record<string, number> = {};
  const per = Math.floor(budget / channels.length);
  channels.forEach(c => (allocation[c] = per));
  // Ajuste para que sume exacto al presupuesto
  allocation[channels[0]] = budget - per * (channels.length - 1);

  const copy =
    `Te invitamos a conocer mas sobre Terapia Magnetica Transcraneal (TMS) y atencion psicologica. ` +
    `Dirigido a ${input.audience || 'personas que buscan bienestar emocional'}. ` +
    `Agenda una valoracion profesional para conocer si esta opcion es adecuada para ti.`;

  return {
    summary: `Campana ${input.name || 'sin nombre'} orientada a ${input.audience || 'audiencia general'} con presupuesto de ${budget} MXN por ${input.durationDays || 15} dias.`,
    audience_segments: [input.audience || 'Audiencia general'],
    budget_allocation: allocation,
    channels,
    creative_concepts: ['Educacion sobre TMS', 'Testimonios de proceso (sin promesas)', 'Cuidado de la salud mental'],
    copy,
    cta: 'Solicita una valoracion profesional',
    expected_metrics: { impressions: budget * 30, clicks: Math.floor(budget * 0.3), conversions: Math.floor(budget * 0.02) },
    timeline: { 'Semana 1': 'Lanzamiento', 'Semana 2': 'Optimizacion' },
  };
}

export async function generateCampaign(env: Env, input: CampaignPromptInput): Promise<CampaignGenerationResult> {
  let campaign: CampaignOutput = templateCampaign(input);
  let model: string | null = null;
  let source: 'gemini' | 'template' = 'template';

  const result = await generateWithGemini(env, { prompt: buildCampaignPrompt(input), temperature: 0.6 });
  if (result) {
    const parsed = extractJsonObject<CampaignOutput>(result.text);
    if (parsed && parsed.summary) {
      campaign = {
        summary: parsed.summary,
        audience_segments: Array.isArray(parsed.audience_segments) ? parsed.audience_segments : [],
        budget_allocation: parsed.budget_allocation && typeof parsed.budget_allocation === 'object' ? parsed.budget_allocation : {},
        channels: Array.isArray(parsed.channels) ? parsed.channels : [],
        creative_concepts: Array.isArray(parsed.creative_concepts) ? parsed.creative_concepts : [],
        copy: parsed.copy || '',
        cta: parsed.cta || 'Solicita una valoracion profesional',
        expected_metrics: parsed.expected_metrics || { impressions: 0, clicks: 0, conversions: 0 },
        timeline: parsed.timeline || {},
      };
      model = result.model;
      source = 'gemini';
    }
  }

  const validation = validateClinicalContent(`${campaign.summary}\n${campaign.copy}`);

  return { campaign, validation, model, source };
}
