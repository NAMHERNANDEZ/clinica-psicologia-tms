import type { Env } from '../../types';

export interface GeminiGenerateOptions {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

export interface GeminiGenerateResult {
  text: string;
  model: string;
  latencyMs: number;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Cliente real de Google Gemini API.
 * La API key se lee de Cloudflare Secrets (env.GEMINI_API_KEY), NUNCA del codigo.
 * Endpoint oficial: generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
export async function generateWithGemini(
  env: Env,
  options: GeminiGenerateOptions
): Promise<GeminiGenerateResult | null> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[gemini] GEMINI_API_KEY no configurada en Cloudflare Secrets. Usando fallback.');
    return null;
  }

  const model = options.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const t0 = Date.now();

  const requestBody = {
    contents: [
      ...(options.system
        ? [{ role: 'user', parts: [{ text: options.system }] }]
        : []),
      { role: 'user', parts: [{ text: options.prompt }] },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
      topP: 0.9,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[gemini] API error ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (data.promptFeedback?.blockReason) {
      console.error(`[gemini] Prompt bloqueado: ${data.promptFeedback.blockReason}`);
      return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('')?.trim();
    if (!text) {
      console.warn('[gemini] Respuesta vacia desde la API.');
      return null;
    }

    return { text, model, latencyMs: Date.now() - t0 };
  } catch (err) {
    console.error('[gemini] Excepcion al llamar a la API:', err);
    return null;
  }
}

/**
 * Helper para extraer JSON de la respuesta. Gemini a veces devuelve
 * markdown con code fences; lo normalizamos.
 */
export function extractJsonObject<T>(text: string): T | null {
  let clean = text.trim();
  const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    clean = fence[1].trim();
  }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1)) as T;
  } catch (err) {
    console.error('[gemini] JSON invalido en respuesta:', err);
    return null;
  }
}
