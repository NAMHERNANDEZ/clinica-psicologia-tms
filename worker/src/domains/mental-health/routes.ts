// ============================================
// ROUTES — worker/src/domains/mental-health/routes.ts
// Endpoints /api/mh/* — todos requieren auth (user.id del token).
// ============================================

import type { Env, User } from '../../types';
import * as repo from './repository';
import {
  computeRecommendation,
  computeDelta,
  computeStreak,
  generateInsightCandidates,
  type SessionRecord,
} from './service';
import {
  validateCheckIn,
  validateConsent,
  validateInterventionSession,
  validateJournal,
  validateId,
} from './validators';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function getRequestId(): string {
  return crypto.randomUUID();
}

// ============================================
// Sincronizacion de insights (dedup por clave, no repetitivos)
// ============================================

async function syncInsights(env: Env, userId: number): Promise<number> {
  const checkins = await repo.listCheckins(env, userId, 30);
  const sessions = await repo.listSessions(env, userId, 100);
  const sessionRecords: SessionRecord[] = sessions.slice().reverse().map(s => ({
    intervention_id: s.intervention_id,
    intervention_slug: s.intervention_slug,
    category: s.category,
    before_intensity: s.before_intensity,
    after_intensity: s.after_intensity,
    delta: s.delta,
    completion: s.completion,
    duration_sec: s.duration_sec,
    created_at: s.created_at,
  }));
  const checkinInsight = checkins.slice().reverse().map(c => ({
    activation: c.activation,
    intensity: c.intensity,
    sleep_hours: c.sleep_hours,
    created_at: c.created_at,
  }));
  const candidates = generateInsightCandidates(checkinInsight, sessionRecords);
  let created = 0;
  for (const cand of candidates) {
    const open = await repo.getOpenInsightByKey(env, userId, cand.insight_key);
    if (open) {
      await repo.touchInsight(env, open.id);
      continue;
    }
    const dismissed = await repo.getDismissedInsightByKey(env, userId, cand.insight_key);
    if (dismissed) continue;
    await repo.createInsight(env, userId, {
      insight_key: cand.insight_key,
      title: cand.title,
      body: cand.body,
      evidence_json: JSON.stringify(cand.evidence),
      period_start: cand.period_start,
      period_end: cand.period_end,
      observation_count: cand.observation_count,
      confidence: cand.confidence,
    });
    created += 1;
  }
  return created;
}

// ============================================
// GET /api/mh/home
// ============================================

export async function handleMhHome(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const latest = await repo.getLatestCheckin(env, user.id);
    const sessions = (await repo.listSessions(env, user.id, 50)).reverse();
    const sessionRecords: SessionRecord[] = sessions.map(s => ({
      intervention_id: s.intervention_id, intervention_slug: s.intervention_slug, category: s.category,
      before_intensity: s.before_intensity, after_intensity: s.after_intensity, delta: s.delta,
      completion: s.completion, duration_sec: s.duration_sec, created_at: s.created_at,
    }));
    const allCheckins = await repo.listCheckins(env, user.id, 500);
    const streak = computeStreak(allCheckins.map(c => c.created_at));
    const insights = (await repo.listInsights(env, user.id, 10)).filter(i => i.status === 'open');
    const interventions = await repo.listInterventions(env);
    const latestRec = await repo.getLatestRecommendation(env, user.id);

    let recommendation = null;
    if (latest) {
      const decision = computeRecommendation(latest, sessionRecords);
      recommendation = {
        intervention_slug: decision.intervention_slug,
        reason: (latestRec && latestRec.source_checkin_id === latest.id) ? latestRec.reason : decision.reason,
        evidence: decision.evidence,
        alternatives: decision.alternatives,
        confidence: decision.confidence,
        safety: decision.safety,
        safety_message: decision.safety_message,
      };
    }

    return json({
      success: true,
      data: {
        today: latest
          ? { checkin: latest, recommendation }
          : null,
        stats: {
          streak: streak.streak,
          dayCount: streak.dayCount,
          checkinsTotal: allCheckins.length,
          sessionsCompleted: sessions.filter(s => s.completion === 1).length,
        },
        insightsPreview: insights.slice(0, 3).map(i => ({
          id: i.id, title: i.title, body: i.body, confidence: i.confidence, last_seen: i.last_seen,
        })),
        interventions: interventions.map(i => ({
          id: i.id, slug: i.slug, title: i.title, description: i.description,
          duration_sec: i.duration_sec, category: i.category, difficulty: i.difficulty,
        })),
      },
      requestId,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhHome error:', err);
    return json({ success: false, error: 'Error al cargar la vista de hoy', requestId }, 500, corsHeaders);
  }
}

// ============================================
// POST /api/mh/checkins
// ============================================

export async function handleMhCreateCheckin(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const validation = validateCheckIn(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const checkin = await repo.createCheckin(env, user.id, validation.data);

    const sessions = (await repo.listSessions(env, user.id, 50)).reverse();
    const sessionRecords: SessionRecord[] = sessions.map(s => ({
      intervention_id: s.intervention_id, intervention_slug: s.intervention_slug, category: s.category,
      before_intensity: s.before_intensity, after_intensity: s.after_intensity, delta: s.delta,
      completion: s.completion, duration_sec: s.duration_sec, created_at: s.created_at,
    }));
    const decision = computeRecommendation(validation.data, sessionRecords);

    if (!decision.safety) {
      const intervention = await repo.getInterventionBySlug(env, decision.intervention_slug);
      if (intervention) {
        await repo.createRecommendation(env, user.id, {
          intervention_id: intervention.id as number,
          source_checkin_id: checkin.id,
          reason: decision.reason,
          evidence_json: JSON.stringify(decision.evidence),
          confidence: decision.confidence,
        });
      }
    }

    await syncInsights(env, user.id);

    return json({
      success: true,
      data: {
        checkin,
        recommendation: {
          intervention_slug: decision.intervention_slug,
          reason: decision.reason,
          evidence: decision.evidence,
          alternatives: decision.alternatives,
          confidence: decision.confidence,
          safety: decision.safety,
          safety_message: decision.safety_message,
        },
      },
      requestId,
    }, 201, corsHeaders);
  } catch (err) {
    console.error('handleMhCreateCheckin error:', err);
    return json({ success: false, error: 'Error al guardar el check-in', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/mh/checkins  |  GET /api/mh/checkins/trend
// ============================================

export async function handleMhListCheckins(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10) || 50;
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;
    const checkins = await repo.listCheckins(env, user.id, limit, from, to);
    return json({ success: true, data: checkins, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhListCheckins error:', err);
    return json({ success: false, error: 'Error al listar check-ins', requestId }, 500, corsHeaders);
  }
}

export async function handleMhTrendCheckins(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '14', 10) || 14;
    const rows = await repo.listCheckins(env, user.id, limit);
    const data = rows.slice().reverse().map(c => ({
      id: c.id,
      date: (c.created_at || '').slice(0, 10),
      intensity: c.intensity,
      activation: c.activation,
      energy: c.energy,
      concentration: c.concentration,
      emotional_state: c.emotional_state,
    }));
    return json({ success: true, data, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhTrendCheckins error:', err);
    return json({ success: false, error: 'Error al calcular tendencia', requestId }, 500, corsHeaders);
  }
}

// ============================================
// INTERVENTIONS catalog / detail
// ============================================

export async function handleMhListInterventions(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const interventions = await repo.listInterventions(env);
    return json({ success: true, data: interventions, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhListInterventions error:', err);
    return json({ success: false, error: 'Error al listar intervenciones', requestId }, 500, corsHeaders);
  }
}

export async function handleMhGetIntervention(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = parseInt(segments[segments.length - 1], 10);
    const v = validateId(id);
    if (!v.valid) return json({ success: false, error: 'id inválido', requestId }, 400, corsHeaders);
    const intervention = await repo.getInterventionById(env, v.data);
    if (!intervention) return json({ success: false, error: 'Intervención no encontrada', requestId }, 404, corsHeaders);
    return json({ success: true, data: intervention, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhGetIntervention error:', err);
    return json({ success: false, error: 'Error al obtener intervención', requestId }, 500, corsHeaders);
  }
}

// ============================================
// POST /api/mh/interventions/:id/sessions  (resultado antes/despues)
// ============================================

export async function handleMhCreateSession(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    // /api/mh/interventions/:id/sessions -> segments[-2] = id
    const id = parseInt(segments[segments.length - 2], 10);
    const v = validateId(id);
    if (!v.valid) return json({ success: false, error: 'id inválido', requestId }, 400, corsHeaders);

    const intervention = await repo.getInterventionById(env, v.data);
    if (!intervention) return json({ success: false, error: 'Intervención no encontrada', requestId }, 404, corsHeaders);

    const body = await request.json().catch(() => ({}));
    const validation = validateInterventionSession(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const delta = computeDelta(validation.data.before_intensity, validation.data.after_intensity);
    const sessionId = await repo.createSession(env, user.id, {
      intervention_id: v.data,
      before_intensity: validation.data.before_intensity,
      after_intensity: validation.data.after_intensity,
      delta,
      completion: validation.data.completion,
      duration_sec: validation.data.duration_sec,
      feedback: validation.data.feedback,
      note: validation.data.note,
    });

    await syncInsights(env, user.id);

    return json({
      success: true,
      data: {
        session_id: sessionId,
        intervention_id: v.data,
        intervention_slug: intervention.slug,
        before_intensity: validation.data.before_intensity,
        after_intensity: validation.data.after_intensity,
        delta,
        observation: delta < 0
          ? `Registraste una reducción de intensidad de ${validation.data.before_intensity}/10 a ${validation.data.after_intensity}/10.`
          : delta > 0
            ? `Registraste un aumento de intensidad de ${validation.data.before_intensity}/10 a ${validation.data.after_intensity}/10.`
            : `Tu intensidad se mantuvo en ${validation.data.before_intensity}/10.`,
        disclaimer: 'Esto es una observación de tu registro. No constituye un diagnóstico ni demuestra causalidad.',
      },
      requestId,
    }, 201, corsHeaders);
  } catch (err) {
    console.error('handleMhCreateSession error:', err);
    return json({ success: false, error: 'Error al guardar la sesión', requestId }, 500, corsHeaders);
  }
}

// ============================================
// GET /api/mh/interventions/sessions
// ============================================

export async function handleMhListSessions(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10) || 50;
    const sessions = await repo.listSessions(env, user.id, limit);
    return json({ success: true, data: sessions, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhListSessions error:', err);
    return json({ success: false, error: 'Error al listar sesiones', requestId }, 500, corsHeaders);
  }
}

// ============================================
// INSIGHTS
// ============================================

export async function handleMhListInsights(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const insights = await repo.listInsights(env, user.id, 50);
    return json({ success: true, data: insights, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhListInsights error:', err);
    return json({ success: false, error: 'Error al listar insights', requestId }, 500, corsHeaders);
  }
}

export async function handleMhDismissInsight(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    // /api/mh/insights/:id/dismiss
    const id = parseInt(segments[segments.length - 2], 10);
    const v = validateId(id);
    if (!v.valid) return json({ success: false, error: 'id inválido', requestId }, 400, corsHeaders);
    const ok = await repo.dismissInsight(env, user.id, v.data);
    if (!ok) return json({ success: false, error: 'Insight no encontrado o ya descartado', requestId }, 404, corsHeaders);
    return json({ success: true, data: { id: v.data, status: 'dismissed' }, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhDismissInsight error:', err);
    return json({ success: false, error: 'Error al descartar insight', requestId }, 500, corsHeaders);
  }
}

// ============================================
// PRIVACIDAD: consents, export, delete
// ============================================

export async function handleMhListConsents(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const consents = await repo.listConsents(env, user.id);
    return json({ success: true, data: consents, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhListConsents error:', err);
    return json({ success: false, error: 'Error al listar consentimientos', requestId }, 500, corsHeaders);
  }
}

export async function handleMhUpsertConsent(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const validation = validateConsent(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }
    const id = await repo.upsertConsent(env, user.id, validation.data.consent_type, validation.data.granted);
    return json({
      success: true,
      data: { id, consent_type: validation.data.consent_type, granted: validation.data.granted },
      requestId,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhUpsertConsent error:', err);
    return json({ success: false, error: 'Error al actualizar consentimiento', requestId }, 500, corsHeaders);
  }
}

export async function handleMhExport(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const data = await repo.exportUserData(env, user.id);
    const payload = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      note: 'Exportación de tus datos de bienestar (Mental Health). No incluye datos clínicos de la clínica.',
      ...data,
    };
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mental-health-export.json"',
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error('handleMhExport error:', err);
    return json({ success: false, error: 'Error al exportar datos', requestId }, 500, corsHeaders);
  }
}

export async function handleMhDeleteAccount(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('confirm') !== '1') {
      return json({ success: false, error: 'Requiere confirm confirm=1', requestId }, 400, corsHeaders);
    }
    await repo.deleteAllUserData(env, user.id);
    return json({
      success: true,
      data: { deleted: true, message: 'Tus datos de bienestar (Mental Health) fueron eliminados permanentemente.' },
      requestId,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhDeleteAccount error:', err);
    return json({ success: false, error: 'Error al eliminar datos', requestId }, 500, corsHeaders);
  }
}

// ============================================
// JOURNAL
// ============================================

export async function handleMhListJournal(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const journal = await repo.listJournal(env, user.id, 100);
    return json({ success: true, data: journal, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('handleMhListJournal error:', err);
    return json({ success: false, error: 'Error al listar entradas de diario', requestId }, 500, corsHeaders);
  }
}

export async function handleMhCreateJournal(
  env: Env, request: Request, user: User, corsHeaders: Record<string, string>
): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const validation = validateJournal(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }
    const id = await repo.createJournal(env, user.id, validation.data.content, validation.data.linked_checkin_id);
    return json({ success: true, data: { id }, requestId }, 201, corsHeaders);
  } catch (err) {
    console.error('handleMhCreateJournal error:', err);
    return json({ success: false, error: 'Error al guardar entrada de diario', requestId }, 500, corsHeaders);
  }
}