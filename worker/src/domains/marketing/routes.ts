import type { Env, User } from '../../types';
import { getMarketingAnalytics } from './analytics/service';
import { generateContent } from '../../ai/services/content-ai';
import { generateCampaign } from '../../ai/services/campaign-ai';
import { generateSeo } from '../../ai/services/seo-ai';
import type { ContentPromptInput } from '../../ai/prompts/marketing';
import type { CampaignPromptInput } from '../../ai/prompts/marketing';
import type { SeoPromptInput } from '../../ai/prompts/marketing';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function auditLog(
  env: Env,
  user: User,
  action: string,
  entityType: string,
  entityId: number | null,
  source: string,
  model: string | null,
  validationScore: number | null,
  validationStatus: string | null
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO ai_audit_logs (clinic_id, action, entity_type, entity_id, model, source, validation_score, validation_status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(user.clinic_id, action, entityType, entityId, model, source, validationScore, validationStatus, user.id).run();
  } catch (err) {
    console.error('Marketing audit log error (non-blocking):', err);
  }
}

export async function handleMarketingOverview(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const analytics = await getMarketingAnalytics(env, user.clinic_id);
    return json({ success: true, data: analytics }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing overview error:', err);
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500, corsHeaders);
  }
}

// POST /api/marketing/content/generate
export async function handleMarketingContentGenerate(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as Partial<ContentPromptInput>;
    if (!body.topic) {
      return json({ success: false, error: 'topic es requerido' }, 400, corsHeaders);
    }
    const input: ContentPromptInput = {
      type: body.type || 'social',
      topic: body.topic,
      audience: body.audience || 'personas que buscan bienestar emocional',
      goal: body.goal || 'informar sobre la TMS',
      length: body.length || 'medio',
      callToAction: body.callToAction || 'Solicita una valoracion profesional',
    };
    const result = await generateContent(env, input);

    // Persistir en D1 (marketing_content) con auditoria
    const inserted = await env.DB.prepare(
      `INSERT INTO marketing_content (clinic_id, content_type, topic, content_json, validation_score, validation_status, model, source, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      user.clinic_id,
      input.type,
      input.topic,
      JSON.stringify(result.content),
      result.validation.score,
      result.validation.status,
      result.model || 'none',
      result.source,
      result.validation.status === 'approved' ? 'PENDING_REVIEW' : 'NEEDS_REVIEW',
      user.id
    ).run();

    const id = inserted.meta?.last_row_id;
    await auditLog(env, user, 'content_generate', 'marketing_content', id, result.source, result.model || null, result.validation.score, result.validation.status);
    return json({ success: true, data: { ...result, id } }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing content generate error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

// POST /api/marketing/campaign/generate
export async function handleMarketingCampaignGenerate(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as Partial<CampaignPromptInput>;
    const input: CampaignPromptInput = {
      name: body.name || 'Campana sin nombre',
      audience: body.audience || 'Audiencia general',
      budget: body.budget || 1000,
      channels: body.channels || ['instagram', 'whatsapp'],
      durationDays: body.durationDays || 15,
      goal: body.goal || 'generar citas de valoracion',
    };
    const result = await generateCampaign(env, input);

    const inserted = await env.DB.prepare(
      `INSERT INTO marketing_campaigns (clinic_id, name, campaign_json, validation_score, validation_status, model, source, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      user.clinic_id,
      input.name,
      JSON.stringify(result.campaign),
      result.validation.score,
      result.validation.status,
      result.model || 'none',
      result.source,
      result.validation.status === 'approved' ? 'DRAFT' : 'NEEDS_REVIEW',
      user.id
    ).run();

    const id = inserted.meta?.last_row_id;
    await auditLog(env, user, 'campaign_generate', 'marketing_campaigns', id, result.source, result.model || null, result.validation.score, result.validation.status);
    return json({ success: true, data: { ...result, id } }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing campaign generate error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

// POST /api/marketing/seo/generate
export async function handleMarketingSeoGenerate(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as Partial<SeoPromptInput>;
    if (!body.keyword) {
      return json({ success: false, error: 'keyword es requerido' }, 400, corsHeaders);
    }
    const input: SeoPromptInput = {
      keyword: body.keyword,
      searchIntent: body.searchIntent || 'informativo',
      competition: body.competition || 'media',
      audience: body.audience || 'personas interesadas en salud mental',
    };
    const result = await generateSeo(env, input);

    const inserted = await env.DB.prepare(
      `INSERT INTO seo_analysis (clinic_id, keyword, seo_json, model, source, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      user.clinic_id,
      input.keyword,
      JSON.stringify(result.seo),
      result.model || 'none',
      result.source,
      user.id
    ).run();

    const id = inserted.meta?.last_row_id;
    await auditLog(env, user, 'seo_generate', 'seo_analysis', id, result.source, result.model || null, null, null);
    return json({ success: true, data: { ...result, id } }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing SEO generate error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

// GET /api/marketing/content  — historial generado por la clinica
export async function handleMarketingContentList(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const rows = await env.DB.prepare(
      `SELECT id, content_type, topic, content_json, validation_score, validation_status, source, status, created_at
       FROM marketing_content WHERE clinic_id = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(user.clinic_id).all();
    return json({ success: true, data: rows.results }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing content list error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

// PATCH /api/marketing/content/:id/status  — aprobacion humana antes de publicar
export async function handleMarketingContentStatus(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/')[4];
    const body = await request.json() as { status: string };
    if (!['PENDING_REVIEW', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED'].includes(body.status)) {
      return json({ success: false, error: 'status invalido' }, 400, corsHeaders);
    }
    const updated = await env.DB.prepare(
      `UPDATE marketing_content SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ? AND clinic_id = ?`
    ).bind(body.status, user.id, id, user.clinic_id).run();
    return json({ success: true, data: { id: Number(id), status: body.status, changes: updated.meta?.changes } }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing content status error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
