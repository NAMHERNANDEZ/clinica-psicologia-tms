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

const DEFAULT_MODEL = 'gemini-3.6-flash';

// Fallback multi-modelo: 3.6 es el primario GA pero responde 503/429 por
// saturacion frecuente. Se prueban en orden y se usa el primero que responda,
// exactamente como ya hace geminiSTTRouter (regresion: LLM de texto 503
// mientras STT funcionaba con 3.5).
const TEXT_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

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

  const models = options.model ? [options.model] : TEXT_MODELS;
  let lastError = 'sin intentos';
  for (const model of models) {
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
        // Evita que el modelo recorte la respuesta visible al agotar el
        // presupuesto de razonamiento (regresion: respuestas cortadas a media
        // frase en produccion). Si un modelo lo rechaza, se reintenta con el
        // siguiente (la config se prueba por modelo dentro del bucle).
        thinkingConfig: { thinkingBudget: 128 },
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
        lastError = `Gemini API HTTP ${response.status} (${model})`;
        console.error(`[gemini] API error ${response.status} (${model}): ${(await response.text()).slice(0, 200)}`);
        continue;
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        promptFeedback?: { blockReason?: string };
      };

      if (data.promptFeedback?.blockReason) {
        lastError = `Prompt bloqueado (${model}): ${data.promptFeedback.blockReason}`;
        console.error(`[gemini] Prompt bloqueado (${model}): ${data.promptFeedback.blockReason}`);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('')?.trim();
      if (!text) {
        lastError = `respuesta vacía (${model})`;
        console.warn(`[gemini] Respuesta vacia desde la API (${model}).`);
        continue;
      }

      return { text, model, latencyMs: Date.now() - t0 };
    } catch (err) {
      lastError = `excepción ${(err as Error).message} (${model})`;
      console.error(`[gemini] Excepcion al llamar a la API (${model}):`, err);
    }
  }
  console.error(`[gemini] todos los modelos fallaron: ${lastError}`);
  return null;
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

export interface GeminiSTTResult {
  result: string | null;
  provider: string;
  error?: string;
}

/**
 * Transcripción de audio con Gemini (STT).
 * Usado como primer proveedor FREE del router de voz TMS.
 * El audio se envía inline en base64 (inline_data) — sin subir a buckets.
 */
export async function geminiSTTRouter(
  env: Env,
  audioData: ArrayBuffer,
  language: string = 'es',
  mimeType: string = 'audio/wav'
): Promise<GeminiSTTResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('TEST') || apiKey.includes('REAL-NEEDED')) {
    return { result: null, provider: 'gemini', error: 'GEMINI_API_KEY no configurada' };
  }
  try {
    // Modelos multimodales GA vigentes con entrada de audio (2026-09).
    // Se prueban en orden; el 3.6 puede responder 503 por saturación.
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
    let lastError = 'sin intentos';
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const bytes = new Uint8Array(audioData);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `Transcribe exactamente este audio en ${language === 'es' ? 'español' : 'inglés'}. Responde solo con la transcripción, sin comentarios.` },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 300 },
        }),
      });
      if (!response.ok) {
        lastError = `Gemini STT HTTP ${response.status} (${model})`;
        continue;
      }
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text || '')
        .join('')
        .trim();
      if (!text) {
        lastError = `transcripción vacía (${model})`;
        continue;
      }
      return { result: text, provider: `gemini:${model}` };
    }
    return { result: null, provider: 'gemini', error: lastError };
  } catch (err) {
    console.error('[geminiSTTRouter] error:', err);
    return { result: null, provider: 'gemini', error: String(err) };
  }
}
