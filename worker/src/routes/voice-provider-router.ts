import type { Env } from '../types';
import { geminiSTTRouter } from '../ai/providers/gemini';

export interface VoiceProviderResult<T> {
  result: T | null;
  provider: string;
  fallbackUsed: boolean;
  latencyMs: number;
  mime?: string;
  error?: string;
}

// Voz TMS: únicamente Gemini FREE + OpenRouter FREE. Sin OrcaRouter/UnoRouter,
// sin Cloudflare Workers AI, sin gTTS, sin modelos locales ni de pago.
// Modelos TTS FREE verificados contra catálogo oficial OpenRouter (2026-09-11):
// - fish-audio/s2.1-pro-free:free: multilingüe, sin voz explícita, MP3 OK probado.
// - deepgram/flux-tts:free: exige voz explícita (documentación oficial Deepgram:
//   formato flux-{voice}-{language}); inglés. Segundo respaldo documentado.
const OPENROUTER_TTS_MODELS: Array<{ model: string; voice?: string }> = [
  { model: 'fish-audio/s2.1-pro-free:free' },
  { model: 'deepgram/flux-tts:free', voice: 'flux-haley-en' },
];
const OPENROUTER_STT_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'thinkingmachines/inkling:free',
  'thinkingmachines/inkling-small:free',
];

function voiceOnlyEnv(env: Env): Env {
  return { ...env, UNOROUTER_API_KEY: undefined };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcm16ToWav(pcm: ArrayBuffer, sampleRate = 24000): ArrayBuffer {
  const data = new Uint8Array(pcm);
  const buffer = new ArrayBuffer(44 + data.length);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + data.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, data.length, true);
  new Uint8Array(buffer, 44).set(data);
  return buffer;
}

function openRouterFormat(mimeType: string): string | null {
  const mime = mimeType.toLowerCase();
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg';
  if (mime.includes('flac')) return 'flac';
  if (mime.includes('m4a') || mime.includes('mp4')) return 'm4a';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('aiff')) return 'aiff';
  if (mime.includes('pcm16')) return 'pcm16';
  if (mime.includes('pcm24')) return 'pcm24';
  return null;
}

async function openRouterTTS(env: Env, text: string): Promise<{ audio: ArrayBuffer; provider: string; model: string }> {
  const apiKey = env.OPENROUTER_API_KEY || '';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurado');
  let lastError = '';
  for (const entry of OPENROUTER_TTS_MODELS) {
    const model = entry.model;
    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev',
        'X-Title': 'Neurociencia Clinica TMS Chat',
      },
      body: JSON.stringify({
        model,
        input: text,
        ...(entry.voice ? { voice: entry.voice } : {}),
        response_format: 'mp3',
      }),
    });
    if (response.ok) {
      return { audio: await response.arrayBuffer(), provider: `openrouter:${model}`, model };
    }
    lastError = `${model}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`;
  }
  throw new Error(`OpenRouter TTS FREE no disponible (${lastError})`);
}

async function geminiTTS(env: Env, text: string, language: string = 'es'): Promise<{ audio: ArrayBuffer; provider: string; model: string }> {
  const apiKey = env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey.includes('TEST') || apiKey.includes('REAL-NEEDED')) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  const model = 'gemini-2.5-flash-preview-tts';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Habla en español de México con tono cálido y calmado: "${text}"` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    }),
  });
  if (!response.ok) throw new Error(`Gemini TTS HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  const data = (await response.json()) as any;
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData;
  if (!inline?.data) throw new Error('Gemini TTS sin audio');
  void language;
  return { audio: pcm16ToWav(base64ToBytes(inline.data).buffer as ArrayBuffer, 24000), provider: `gemini:${model}`, model };
}

async function openRouterSTT(env: Env, audioData: ArrayBuffer, mimeType: string, language: string): Promise<{ text: string; provider: string; model: string }> {
  const apiKey = env.OPENROUTER_API_KEY || '';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurado');
  const format = openRouterFormat(mimeType);
  if (!format) throw new Error(`Formato no soportado por OpenRouter STT FREE: ${mimeType}`);
  const audioBase64 = arrayBufferToBase64(audioData);
  let lastError = '';
  for (const model of OPENROUTER_STT_MODELS) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev',
        'X-Title': 'Neurociencia Clinica TMS Chat',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Transcribe exactamente este audio en ${language === 'es' ? 'español' : 'inglés'}. Responde solo con la transcripción.` },
              { type: 'input_audio', input_audio: { data: audioBase64, format } },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });
    if (!response.ok) {
      lastError = `${model}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`;
      continue;
    }
    const data = (await response.json()) as any;
    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    if (text) return { text, provider: `openrouter:${model}`, model };
    lastError = `${model}: transcripción vacía`;
  }
  throw new Error(`OpenRouter STT FREE no disponible (${lastError})`);
}

export async function ttsRouter(env: Env, text: string, language: string = 'es'): Promise<VoiceProviderResult<ArrayBuffer>> {
  const t0 = Date.now();
  const restricted = voiceOnlyEnv(env);

  try {
    const spoken = await openRouterTTS(restricted, text);
    return { provider: spoken.provider, result: spoken.audio, mime: 'audio/mpeg', fallbackUsed: false, latencyMs: Date.now() - t0 };
  } catch (err) {
    console.error('[ttsRouter] OpenRouter FREE no disponible:', err);
  }

  try {
    const spoken = await geminiTTS(restricted, text, language);
    return { provider: spoken.provider, result: spoken.audio, mime: 'audio/wav', fallbackUsed: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    console.error('[ttsRouter] Gemini FREE no disponible:', err);
  }

  return { provider: 'none', result: null, error: 'TTS FREE no disponible (OpenRouter FREE + Gemini)', fallbackUsed: true, latencyMs: Date.now() - t0 };
}

export async function sttRouter(env: Env, audioData: ArrayBuffer, language: string = 'es', mimeType: string = 'audio/wav'): Promise<VoiceProviderResult<string>> {  const t0 = Date.now();
  const restricted = voiceOnlyEnv(env);

  try {
    const geminiResult = await geminiSTTRouter(restricted, audioData, language, mimeType);
    if (geminiResult.result && !geminiResult.error) {
      return {
        provider: geminiResult.provider,
        result: geminiResult.result,
        fallbackUsed: false,
        latencyMs: Date.now() - t0,
      };
    }
    console.warn('[sttRouter] Gemini STT FREE no disponible:', geminiResult.error || 'sin resultado');
  } catch (err: any) {
    console.error('[sttRouter] Error Gemini STT FREE:', err);
  }

  try {
    const spoken = await openRouterSTT(restricted, audioData, mimeType, language);
    return {
      provider: spoken.provider,
      result: spoken.text,
      fallbackUsed: true,
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    console.error('[sttRouter] Error OpenRouter STT FREE:', err);
  }

  return { provider: 'none', result: null, error: 'STT FREE no disponible (Gemini + OpenRouter FREE)', fallbackUsed: true, latencyMs: Date.now() - t0 };
}

// Contrato que lee VoiceChat.tsx (transcribeAndSend): {success, text} en
// top-level. Se conserva `transcript` como alias. Sin este shape plano el
// cliente descarta toda transcripción exitosa (causa raíz 2026-09-14).
export function toSttClientPayload(stt: VoiceProviderResult<string>): { status: number; body: Record<string, unknown> } {
  if (stt.error || !stt.result?.trim()) {
    return {
      status: 500,
      body: { success: false, error: stt.error || 'Transcripción vacía', provider: stt.provider, fallbackUsed: stt.fallbackUsed },
    };
  }
  return {
    status: 200,
    body: { success: true, text: stt.result, transcript: stt.result, provider: stt.provider, fallbackUsed: stt.fallbackUsed },
  };
}
