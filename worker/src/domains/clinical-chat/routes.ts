import type { Env, User } from '../../types';
import { processClinicalChat } from '../../ai/services/chat-ai';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function jsonError(error: string, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return 'chat_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleClinicalChatMessage(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { message?: string; sessionId?: string };
    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      return jsonError('message is required', 400, corsHeaders);
    }

    const sessionId = body.sessionId || generateSessionId();

    // Get previous messages for context
    let previousMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      const existing = await env.DB.prepare(
        `SELECT role, content FROM clinical_chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 10`
      ).bind(sessionId).all<{ role: string; content: string }>();
      previousMessages = (existing.results || []).map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }));
    } catch {
      // First message in session
    }

    const response = await processClinicalChat(env, body.message, {
      sessionId,
      previousMessages,
    });

    // Persist messages
    try {
      // Create session if new
      await env.DB.prepare(
        `INSERT OR IGNORE INTO clinical_chat_sessions (session_id, clinic_id, started_at, status) VALUES (?, 1, datetime('now'), 'active')`
      ).bind(sessionId).run();

      // Save user message
      await env.DB.prepare(
        `INSERT INTO clinical_chat_messages (session_id, role, content, intent, confidence, created_at) VALUES (?, 'user', ?, ?, ?, datetime('now'))`
      ).bind(sessionId, body.message, response.intent, response.confidence).run();

      // Save assistant message
      await env.DB.prepare(
        `INSERT INTO clinical_chat_messages (session_id, role, content, intent, confidence, action, created_at) VALUES (?, 'assistant', ?, ?, ?, ?, datetime('now'))`
      ).bind(sessionId, response.message, response.intent, response.confidence, response.action).run();

      // Extract and save lead if contact info found
      if (response.contact) {
        const c = response.contact;
        if (c.nombre || c.telefono) {
          try {
            await env.DB.prepare(
              `INSERT INTO leads (nombre, telefono, email, origen, estado, mensaje, clinic_id, fecha_creacion, updated_at)
               VALUES (?, ?, ?, 'chat_ai', 'nuevo', ?, 1, datetime('now'), datetime('now'))`
            ).bind(
              c.nombre || null,
              c.telefono || null,
              c.email || null,
              body.message
            ).run();
          } catch (err) {
            console.error('Lead capture error (non-blocking):', err);
          }
        }
      }

      // Update session last activity
      await env.DB.prepare(
        `UPDATE clinical_chat_sessions SET last_message_at = datetime('now'), message_count = message_count + 2 WHERE session_id = ?`
      ).bind(sessionId).run();
    } catch (err) {
      console.error('Chat persistence error (non-blocking):', err);
    }

    return json({
      sessionId,
      message: response.message,
      intent: response.intent,
      confidence: response.confidence,
      action: response.action,
      followUp: response.followUp,
      contact: response.contact,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('Clinical chat error:', err);
    return jsonError('Internal error', 500, corsHeaders);
  }
}

export async function handleClinicalChatSessions(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await env.DB.prepare(
      `SELECT session_id, started_at, last_message_at, message_count, status
       FROM clinical_chat_sessions
       WHERE clinic_id = ?
       ORDER BY last_message_at DESC
       LIMIT ? OFFSET ?`
    ).bind(user.clinic_id, limit, offset).all();

    return json({ sessions: result.results || [], total: result.results?.length || 0 }, 200, corsHeaders);
  } catch (err) {
    console.error('Chat sessions error:', err);
    return jsonError('Internal error', 500, corsHeaders);
  }
}

export async function handleClinicalChatSessionMessages(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, sessionId: string): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      `SELECT role, content, intent, confidence, action, created_at
       FROM clinical_chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`
    ).bind(sessionId).all();

    return json({ messages: result.results || [] }, 200, corsHeaders);
  } catch (err) {
    console.error('Chat session messages error:', err);
    return jsonError('Internal error', 500, corsHeaders);
  }
}

export async function handleClinicalChatStats(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const stats = await env.DB.prepare(
      `SELECT
         COUNT(DISTINCT session_id) as total_sessions,
         COUNT(*) as total_messages,
         SUM(CASE WHEN action = 'create_appointment' THEN 1 ELSE 0 END) as appointments_requested,
         SUM(CASE WHEN action = 'transfer_human' THEN 1 ELSE 0 END) as emergency_transfers,
         SUM(CASE WHEN action = 'capture_lead' THEN 1 ELSE 0 END) as leads_captured,
         AVG(confidence) as avg_confidence
       FROM clinical_chat_messages
       WHERE role = 'assistant'`
    ).first();

    const topIntents = await env.DB.prepare(
      `SELECT intent, COUNT(*) as count
       FROM clinical_chat_messages
       WHERE role = 'assistant' AND intent IS NOT NULL
       GROUP BY intent
       ORDER BY count DESC
       LIMIT 5`
    ).all();

    return json({
      stats: stats || { total_sessions: 0, total_messages: 0, appointments_requested: 0, emergency_transfers: 0, leads_captured: 0, avg_confidence: 0 },
      topIntents: topIntents.results || [],
    }, 200, corsHeaders);
  } catch (err) {
    console.error('Chat stats error:', err);
    return jsonError('Internal error', 500, corsHeaders);
  }
}
