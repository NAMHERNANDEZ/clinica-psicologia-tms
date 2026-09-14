import type { Env } from '../../types';
import { limitChatText } from '../../lib/input-limits';
import { createSecretary } from '../../lib/ai-secretary';
import { crisisGate } from '../../ai/services/crisis-handler';
import { extractLeadFromMessage } from '../leads/extractor';
import { handleCreateLead } from '../leads/routes';

function jsonError(error: string, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  return new Response(JSON.stringify({ success: false, error, requestId }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Public chat assistant - no authentication required (patient acquisition)
// Wire contract (frontend contract, src/pages/Chat.tsx): flat shape with
// `message` at top level. NEVER nest the payload under `data` - the frontend
// reads `response.message` directly and a nested envelope renders an empty
// assistant bubble (regression: chat empty bubbles, 2026-09-12).
export async function handleChat(env: Env, request: Request, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  let body: { message?: string };
  try {
    body = await request.json() as { message?: string };
  } catch {
    return jsonError('Invalid JSON body', 400, corsHeaders, requestId);
  }
  if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
    return jsonError('message is required', 400, corsHeaders, requestId);
  }
  // Anti-abuso: acota el input antes de consumir cuota LLM
  const safeMessage = limitChatText(body.message);
  if (!safeMessage) {
    return jsonError('message is required', 400, corsHeaders, requestId);
  }
  // SAFETY GATE (prioridad máxima, determinista): crisis NUNCA entra a
  // secretary/booking. Contrato plano igual que el resto de respuestas.
  const gate = crisisGate(safeMessage);
  if (gate.crisis) {
    return new Response(JSON.stringify({
      success: true,
      action: 'transfer_human',
      message: gate.message,
      template: 'crisis',
      confidence: 1,
      crisis: true,
      requestId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  const secretary = createSecretary('free');
  const result = await secretary.processMessage(safeMessage);
  // Lead capture: if the message contains contact data, save a lead (no clinical data)
  try {
    const extracted = extractLeadFromMessage(body.message);
    if (extracted) {
      await handleCreateLead(env, new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify({ ...extracted, origen: 'chat' }) }), corsHeaders, null);
    }
  } catch (err) {
    console.error('Lead capture error (non-blocking):', err);
  }
  return new Response(JSON.stringify({
    success: true,
    action: result.action,
    message: result.message,
    template: result.template,
    confidence: result.confidence,
    requestId,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
