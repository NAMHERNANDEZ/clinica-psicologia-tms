// ============================================
// CBT REPOSITORY — MH-EXPANSION 1.2
// Persistencia user-scoped, reutiliza mh_interventions.
// ============================================

import type { Env } from '../../types';

export interface CbtSessionRow {
  id: number;
  user_id: number;
  phase: string;
  status: string;
  situation: string | null;
  automatic_thought: string | null;
  emotion: string | null;
  emotion_intensity: number | null;
  behavior: string | null;
  evidence_for: string | null;
  evidence_against: string | null;
  balanced_thought: string | null;
  experiment: string | null;
  experiment_outcome: string | null;
  selected_strategy: string | null;
  intervention_slug: string | null;
  intervention_id: number | null;
  before_score: number | null;
  after_score: number | null;
  delta: number | null;
  insight: string | null;
  next_step: string | null;
  linked_checkin_id: number | null;
  linked_wellbeing_id: number | null;
  context_json: string | null;
  created_at: string;
  updated_at: string;
}

export async function createCbtSession(env: Env, userId: number, data: {
  linked_checkin_id?: number | null;
  before_score?: number | null;
  context_json?: string | null;
}): Promise<CbtSessionRow> {
  const res = await env.DB.prepare(
    `INSERT INTO mh_cbt_sessions (user_id, linked_checkin_id, before_score, context_json, phase, status)
     VALUES (?, ?, ?, ?, 'listen', 'active')`
  ).bind(userId, data.linked_checkin_id ?? null, data.before_score ?? null, data.context_json ?? null).run();
  const id = res.meta?.last_row_id as number;
  const row = await getCbtSessionById(env, userId, id);
  if (!row) throw new Error('cbt session not found after insert');
  return row;
}

export async function getCbtSessionById(env: Env, userId: number, id: number): Promise<CbtSessionRow | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM mh_cbt_sessions WHERE id = ? AND user_id = ?`
  ).bind(id, userId).first<CbtSessionRow>();
  return row ?? null;
}

export async function listCbtSessions(env: Env, userId: number, limit = 50): Promise<CbtSessionRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM mh_cbt_sessions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`
  ).bind(userId).all<CbtSessionRow>();
  return results;
}

export async function updateCbtSession(env: Env, userId: number, id: number, patch: Record<string, unknown>): Promise<CbtSessionRow | null> {
  const allowed = [
    'phase','status','situation','automatic_thought','emotion','emotion_intensity','behavior',
    'evidence_for','evidence_against','balanced_thought','experiment','experiment_outcome',
    'selected_strategy','intervention_slug','intervention_id','before_score','after_score','delta',
    'insight','next_step','context_json','linked_checkin_id'
  ];
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of allowed) {
    if (k in patch) {
      sets.push(`${k} = ?`);
      vals.push(patch[k]);
    }
  }
  if (sets.length === 0) return getCbtSessionById(env, userId, id);
  // delta auto if before and after present
  if ('before_score' in patch || 'after_score' in patch) {
    const current = await getCbtSessionById(env, userId, id);
    if (current) {
      const before = ('before_score' in patch ? patch['before_score'] : current.before_score) as number | null;
      const after = ('after_score' in patch ? patch['after_score'] : current.after_score) as number | null;
      if (before !== null && after !== null) {
        // ensure delta in patch
        if (!sets.includes('delta = ?')) { sets.push('delta = ?'); vals.push(after - before); }
        else {
          // replace existing delta if present
        }
      }
    }
  }
  vals.push(id, userId);
  await env.DB.prepare(`UPDATE mh_cbt_sessions SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).bind(...vals).run();
  return getCbtSessionById(env, userId, id);
}

export async function deleteCbtSession(env: Env, userId: number, id: number): Promise<boolean> {
  const res = await env.DB.prepare(`DELETE FROM mh_cbt_sessions WHERE id = ? AND user_id = ?`).bind(id, userId).run();
  return ((res.meta?.changes ?? 0) as number) > 0;
}

export async function exportCbtData(env: Env, userId: number) {
  return listCbtSessions(env, userId, 1000);
}

export async function deleteAllCbtForUser(env: Env, userId: number): Promise<void> {
  await env.DB.prepare(`DELETE FROM mh_cbt_sessions WHERE user_id = ?`).bind(userId).run();
}
