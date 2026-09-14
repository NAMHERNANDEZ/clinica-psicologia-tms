// ============================================
// REPOSITORY — worker/src/domains/mental-health/repository.ts
// Todas las queries son user-scoped. Nunca se acepta user_id del cliente.
// ============================================

import type { Env } from '../../types';

export interface CheckInRow {
  id: number;
  user_id: number;
  emotional_state: string;
  intensity: number;
  activation: number;
  energy: number;
  concentration: number;
  sleep_hours: number | null;
  context: string | null;
  note: string | null;
  created_at: string;
}

export interface SessionRow {
  id: number;
  user_id: number;
  intervention_id: number;
  before_intensity: number;
  after_intensity: number;
  delta: number;
  completion: number;
  duration_sec: number | null;
  feedback: number | null;
  note: string | null;
  created_at: string;
  intervention_slug: string;
  intervention_title: string;
  category: string;
}

// ============================================
// CHECK-INS
// ============================================

export async function createCheckin(
  env: Env,
  userId: number,
  data: {
    emotional_state: string; intensity: number; activation: number; energy: number;
    concentration: number; sleep_hours: number | null; context: string; note: string;
  }
): Promise<CheckInRow> {
  const res = await env.DB.prepare(
    `INSERT INTO mh_checkins (user_id, emotional_state, intensity, activation, energy, concentration, sleep_hours, context, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    userId, data.emotional_state, data.intensity, data.activation, data.energy,
    data.concentration, data.sleep_hours, data.context || null, data.note || null
  ).run();
  const id = res.meta?.last_row_id as number;
  const row = await getCheckinById(env, userId, id);
  if (!row) throw new Error('checkin not found after insert');
  return row;
}

export async function getCheckinById(env: Env, userId: number, id: number): Promise<CheckInRow | null> {
  const row = await env.DB.prepare(
    `SELECT id, user_id, emotional_state, intensity, activation, energy, concentration, sleep_hours, context, note, created_at
     FROM mh_checkins WHERE id = ? AND user_id = ?`
  ).bind(id, userId).first<CheckInRow>();
  return row ?? null;
}

export async function getLatestCheckin(env: Env, userId: number): Promise<CheckInRow | null> {
  const row = await env.DB.prepare(
    `SELECT id, user_id, emotional_state, intensity, activation, energy, concentration, sleep_hours, context, note, created_at
     FROM mh_checkins WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`
  ).bind(userId).first<CheckInRow>();
  return row ?? null;
}

export async function listCheckins(
  env: Env,
  userId: number,
  limit = 50,
  from?: string,
  to?: string
): Promise<CheckInRow[]> {
  let sql = `SELECT id, user_id, emotional_state, intensity, activation, energy, concentration, sleep_hours, context, note, created_at
             FROM mh_checkins WHERE user_id = ?`;
  const params: unknown[] = [userId];
  if (from) {
    sql += ` AND created_at >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND created_at <= ?`;
    params.push(to);
  }
  sql += ` ORDER BY created_at DESC, id DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`;
  const { results } = await env.DB.prepare(sql).bind(...params).all<CheckInRow>();
  return results;
}

// ============================================
// INTERVENTIONS (catalogo)
// ============================================

export async function listInterventions(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, title, description, duration_sec, category, difficulty, instructions, before_measurements, after_measurements, contraindications_or_limits, created_at
     FROM mh_interventions ORDER BY duration_sec ASC`
  ).all();
  return results;
}

export async function getInterventionById(env: Env, id: number) {
  const row = await env.DB.prepare(
    `SELECT id, slug, title, description, duration_sec, category, difficulty, instructions, before_measurements, after_measurements, contraindications_or_limits, created_at
     FROM mh_interventions WHERE id = ?`
  ).bind(id).first();
  return row ?? null;
}

export async function getInterventionBySlug(env: Env, slug: string) {
  const row = await env.DB.prepare(
    `SELECT id, slug, title, description, duration_sec, category, difficulty, instructions, before_measurements, after_measurements, contraindications_or_limits, created_at
     FROM mh_interventions WHERE slug = ?`
  ).bind(slug).first();
  return row ?? null;
}

// ============================================
// INTERVENTION SESSIONS (resultado antes/despues)
// ============================================

export async function createSession(
  env: Env,
  userId: number,
  data: {
    intervention_id: number; before_intensity: number; after_intensity: number;
    delta: number; completion: number; duration_sec: number | null; feedback: number | null; note: string;
  }
): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO mh_intervention_sessions (user_id, intervention_id, before_intensity, after_intensity, delta, completion, duration_sec, feedback, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    userId, data.intervention_id, data.before_intensity, data.after_intensity, data.delta,
    data.completion, data.duration_sec, data.feedback, data.note || null
  ).run();
  return res.meta?.last_row_id as number;
}

export async function listSessions(env: Env, userId: number, limit = 50): Promise<SessionRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.intervention_id, s.before_intensity, s.after_intensity, s.delta, s.completion,
            s.duration_sec, s.feedback, s.note, s.created_at,
            i.slug AS intervention_slug, i.title AS intervention_title, i.category
     FROM mh_intervention_sessions s
     JOIN mh_interventions i ON i.id = s.intervention_id
     WHERE s.user_id = ? ORDER BY s.created_at DESC, s.id DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`
  ).bind(userId).all<SessionRow>();
  return results;
}

// ============================================
// RECOMMENDATIONS
// ============================================

export async function createRecommendation(
  env: Env,
  userId: number,
  data: { intervention_id: number; source_checkin_id: number | null; reason: string; evidence_json: string; confidence: number }
): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO mh_recommendations (user_id, intervention_id, source_checkin_id, reason, evidence_json, confidence)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(userId, data.intervention_id, data.source_checkin_id, data.reason, data.evidence_json, data.confidence).run();
  return res.meta?.last_row_id as number;
}

export async function getLatestRecommendation(env: Env, userId: number) {
  const row = await env.DB.prepare(
    `SELECT r.id, r.intervention_id, r.source_checkin_id, r.reason, r.evidence_json, r.confidence, r.created_at,
            i.slug AS intervention_slug, i.title AS intervention_title, i.category, i.duration_sec
     FROM mh_recommendations r JOIN mh_interventions i ON i.id = r.intervention_id
     WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 1`
  ).bind(userId).first();
  return row ?? null;
}

// ============================================
// INSIGHTS
// ============================================

export async function listInsights(env: Env, userId: number, limit = 30) {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, insight_key, title, body, evidence_json, period_start, period_end, variables_json,
            observation_count, confidence, status, first_seen, last_seen, created_at
     FROM mh_insights WHERE user_id = ? ORDER BY last_seen DESC, id DESC LIMIT ${Math.max(1, Math.min(limit, 100))}`
  ).bind(userId).all();
  return results;
}

export async function getOpenInsightByKey(env: Env, userId: number, key: string) {
  const row = await env.DB.prepare(
    `SELECT id FROM mh_insights WHERE user_id = ? AND insight_key = ? AND status = 'open' LIMIT 1`
  ).bind(userId, key).first<{ id: number }>();
  return row ?? null;
}

export async function getDismissedInsightByKey(env: Env, userId: number, key: string) {
  const row = await env.DB.prepare(
    `SELECT id FROM mh_insights WHERE user_id = ? AND insight_key = ? AND status = 'dismissed' LIMIT 1`
  ).bind(userId, key).first<{ id: number }>();
  return row ?? null;
}

export async function createInsight(
  env: Env,
  userId: number,
  c: {
    insight_key: string; title: string; body: string; evidence_json: string;
    period_start: string | null; period_end: string | null; observation_count: number; confidence: number;
  }
): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO mh_insights (user_id, insight_key, title, body, evidence_json, period_start, period_end, observation_count, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(userId, c.insight_key, c.title, c.body, c.evidence_json, c.period_start, c.period_end, c.observation_count, c.confidence).run();
  return res.meta?.last_row_id as number;
}

export async function touchInsight(env: Env, id: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE mh_insights SET last_seen = datetime('now') WHERE id = ?`
  ).bind(id).run();
}

export async function dismissInsight(env: Env, userId: number, id: number): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE mh_insights SET status = 'dismissed' WHERE id = ? AND user_id = ? AND status = 'open'`
  ).bind(id, userId).run();
  const changes = (res.meta?.changes ?? 0) as number;
  return changes > 0;
}

// ============================================
// CONSENTS
// ============================================

export async function listConsents(env: Env, userId: number) {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, consent_type, granted, granted_at, revoked_at, version
     FROM mh_consents WHERE user_id = ? ORDER BY id DESC`
  ).bind(userId).all();
  return results;
}

export async function upsertConsent(env: Env, userId: number, consentType: string, granted: boolean): Promise<number> {
  const existing = await env.DB.prepare(
    `SELECT id FROM mh_consents WHERE user_id = ? AND consent_type = ? LIMIT 1`
  ).bind(userId, consentType).first<{ id: number }>();
  if (existing) {
    if (granted) {
      await env.DB.prepare(
        `UPDATE mh_consents SET granted = 1, granted_at = datetime('now'), revoked_at = NULL WHERE id = ?`
      ).bind(existing.id).run();
    } else {
      await env.DB.prepare(
        `UPDATE mh_consents SET granted = 0, revoked_at = datetime('now') WHERE id = ?`
      ).bind(existing.id).run();
    }
    return existing.id;
  }
  const res = await env.DB.prepare(
    `INSERT INTO mh_consents (user_id, consent_type, granted, granted_at) VALUES (?, ?, ?, datetime('now'))`
  ).bind(userId, consentType, granted ? 1 : 0).run();
  return res.meta?.last_row_id as number;
}

// ============================================
// JOURNAL
// ============================================

export async function listJournal(env: Env, userId: number, limit = 50) {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, content, linked_checkin_id, created_at
     FROM mh_journal_entries WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ${Math.max(1, Math.min(limit, 100))}`
  ).bind(userId).all();
  return results;
}

export async function createJournal(env: Env, userId: number, content: string, linkedCheckinId: number | null): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO mh_journal_entries (user_id, content, linked_checkin_id) VALUES (?, ?, ?)`
  ).bind(userId, content, linkedCheckinId).run();
  return res.meta?.last_row_id as number;
}

// ============================================
// EXTRACCION / SUPERVIVENCIA (derechos del usuario)
// ============================================

export async function exportUserData(env: Env, userId: number) {
  const checkins = await listCheckins(env, userId, 1000);
  const sessions = await listSessions(env, userId, 1000);
  const insights = await listInsights(env, userId, 500);
  const consents = await listConsents(env, userId);
  const journal = await listJournal(env, userId, 1000);
  const recommendations = (await env.DB.prepare(
    `SELECT r.id, r.intervention_id, r.source_checkin_id, r.reason, r.evidence_json, r.confidence, r.created_at,
            i.slug AS intervention_slug
     FROM mh_recommendations r JOIN mh_interventions i ON i.id = r.intervention_id
     WHERE r.user_id = ? ORDER BY r.created_at DESC`
  ).bind(userId).all()).results;
  let cbt_sessions: unknown[] = [];
  try {
    const { results } = await env.DB.prepare(`SELECT * FROM mh_cbt_sessions WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all();
    cbt_sessions = results;
  } catch { cbt_sessions = []; }
  return { checkins, sessions, insights, consents, journal, recommendations, cbt_sessions };
}

export async function deleteAllUserData(env: Env, userId: number): Promise<void> {
  const tables = [
    'mh_intervention_sessions', 'mh_recommendations', 'mh_insights',
    'mh_consents', 'mh_journal_entries', 'mh_checkins', 'mh_profiles', 'mh_cbt_sessions',
  ];
  for (const table of tables) {
    try {
      await env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId).run();
    } catch {
      // tabla puede no existir en migraciones viejas — ignorar
    }
  }
}