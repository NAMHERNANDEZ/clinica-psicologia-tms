// ============================================
// CBT ROUTES — MH-EXPANSION 1.2
// /api/mh/cbt/*  — user-scoped, safety gate integrado
// ============================================

import type { Env, User } from '../../types';
import * as cbtRepo from './cbt-repository';
import * as mhRepo from './repository';
import { validateCbtCreate, validateCbtFormulation, validateCbtUpdate, validateCbtReevaluate } from './cbt-validators';
import { mapFormulationToStrategy, checkCrisisGate, computeCbtDelta, buildCbtInsight, nextPhase } from './cbt-service';
import { validateId } from './validators';

function json(data: unknown, status: number, cors: Record<string,string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors }});
}
function getRequestId(){ return crypto.randomUUID(); }

// POST /api/mh/cbt/sessions — iniciar sesión CBT
export async function handleCbtCreateSession(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid = getRequestId();
  try {
    const body = await request.json().catch(()=> ({}));
    const v = validateCbtCreate(body);
    if (!v.valid) return json({ success:false, error:v.error, requestId:rid },400,cors);
    // verificar checkin si se vincula
    let linkedCheckinIntensity: number | null = null;
    if (v.data.linked_checkin_id) {
      const ci = await mhRepo.getCheckinById(env, user.id, v.data.linked_checkin_id);
      if (!ci) return json({ success:false, error:'linked_checkin_id no encontrado', requestId:rid },404,cors);
      linkedCheckinIntensity = ci.intensity;
    }
    // safety gate en creación: si before_score ya es crítico, marcar pero no bloquear creación; bloquear intervene/strategy
    const crisis = checkCrisisGate(v.data.before_score ?? null, null, linkedCheckinIntensity);
    const session = await cbtRepo.createCbtSession(env, user.id, {
      linked_checkin_id: v.data.linked_checkin_id ?? null,
      before_score: v.data.before_score ?? null,
      context_json: v.data.context_json ?? null,
    });
    return json({ success:true, data:{ session, safety: crisis.crisis ? { crisis:true, safety_message: crisis.message } : { crisis:false }, disclaimer:'No diagnóstico clínico.' }, requestId:rid },201,cors);
  } catch(e){ console.error('handleCbtCreateSession',e); return json({ success:false, error:'Error al crear sesión CBT', requestId:rid },500,cors); }
}

// GET /api/mh/cbt/sessions
export async function handleCbtListSessions(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const url=new URL(request.url);
    const limit=parseInt(url.searchParams.get('limit')||'50',10)||50;
    const rows=await cbtRepo.listCbtSessions(env,user.id,limit);
    return json({ success:true, data:rows, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error al listar', requestId:rid },500,cors); }
}

// GET /api/mh/cbt/sessions/:id
export async function handleCbtGetSession(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const url=new URL(request.url);
    const id=parseInt(url.pathname.split('/').pop()||'',10);
    const v=validateId(id); if(!v.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const row=await cbtRepo.getCbtSessionById(env,user.id,v.data);
    if(!row) return json({ success:false, error:'Sesión CBT no encontrada', requestId:rid },404,cors);
    return json({ success:true, data:row, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error', requestId:rid },500,cors); }
}

// PATCH /api/mh/cbt/sessions/:id — actualizar formulación parcial y fase
export async function handleCbtPatchSession(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const url=new URL(request.url);
    const id=parseInt(url.pathname.split('/').pop()||'',10);
    const vId=validateId(id); if(!vId.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const existing=await cbtRepo.getCbtSessionById(env,user.id,vId.data);
    if(!existing) return json({ success:false, error:'Sesión CBT no encontrada', requestId:rid },404,cors);
    const body=await request.json().catch(()=> ({}));
    const v=validateCbtUpdate(body);
    if(!v.valid) return json({ success:false, error:v.error, requestId:rid },400,cors);
    // si intenta avanzar a intervene y hay crisis -> bloquear
    if (v.data.phase === 'intervene' || v.data.selected_strategy || v.data.intervention_slug) {
      const crisis=checkCrisisGate(v.data.before_score ?? existing.before_score, existing.emotion_intensity, null);
      if (crisis.crisis) {
        return json({ success:false, error:'Crisis gate: intervención CBT pausada por intensidad muy alta', safety_message: crisis.message, crisis:true, requestId:rid },409,cors);
      }
    }
    // mapear patch a columnas, filtrando undefined
    const patch: Record<string,unknown> = {};
    for (const [k, val] of Object.entries(v.data)) {
      if (val !== undefined) patch[k]=val;
    }
    // si balanced_thought se actualiza y no hay phase, avanzar a intervene hint
    const updated=await cbtRepo.updateCbtSession(env,user.id,vId.data,patch);
    return json({ success:true, data:updated, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error al actualizar', requestId:rid },500,cors); }
}

// POST /api/mh/cbt/sessions/:id/formulate — guarda formulación y avanza fase
export async function handleCbtFormulate(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const url=new URL(request.url);
    const segs=url.pathname.split('/'); const id=parseInt(segs[segs.length-2],10);
    const vId=validateId(id); if(!vId.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const existing=await cbtRepo.getCbtSessionById(env,user.id,vId.data);
    if(!existing) return json({ success:false, error:'Sesión CBT no encontrada', requestId:rid },404,cors);
    const body=await request.json().catch(()=> ({}));
    const v=validateCbtFormulation(body);
    if(!v.valid) return json({ success:false, error:v.error, requestId:rid },400,cors);
    const patch: Record<string,unknown> = { ...v.data, phase:'formulate' };
    const updated=await cbtRepo.updateCbtSession(env,user.id,vId.data,patch);
    return json({ success:true, data:updated, disclaimer:'Formulación de bienestar, no diagnóstico.', requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error', requestId:rid },500,cors); }
}

// POST /api/mh/cbt/sessions/:id/strategy — mapper a intervención existente
export async function handleCbtStrategy(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const url=new URL(request.url);
    const id=parseInt(url.pathname.split('/').pop()?.replace('strategy','')||url.pathname.split('/')[url.pathname.split('/').length-2],10);
    // robust parse: /api/mh/cbt/sessions/:id/strategy
    const segs=url.pathname.split('/'); const sid=parseInt(segs[segs.length-2],10);
    const vId=validateId(sid); if(!vId.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const existing=await cbtRepo.getCbtSessionById(env,user.id,vId.data);
    if(!existing) return json({ success:false, error:'Sesión CBT no encontrada', requestId:rid },404,cors);
    // safety gate antes de estrategia
    const crisis=checkCrisisGate(existing.before_score, existing.emotion_intensity, null);
    if(crisis.crisis) return json({ success:false, error:'Crisis gate activo', safety_message: crisis.message, crisis:true, requestId:rid },409,cors);
    const decision=mapFormulationToStrategy({
      situation: existing.situation,
      automatic_thought: existing.automatic_thought,
      emotion: existing.emotion,
      emotion_intensity: existing.emotion_intensity,
      behavior: existing.behavior,
      evidence_for: existing.evidence_for,
      evidence_against: existing.evidence_against,
      before_score: existing.before_score,
      context_json: existing.context_json,
    });
    // verificar slug existe en catálogo
    const interv=await mhRepo.getInterventionBySlug(env, decision.intervention_slug);
    if(!interv) return json({ success:false, error:'intervención seleccionada no encontrada en catálogo', requestId:rid },500,cors);
    const updated=await cbtRepo.updateCbtSession(env,user.id,vId.data,{
      selected_strategy: decision.selected_strategy,
      intervention_slug: decision.intervention_slug,
      intervention_id: interv.id as number,
      phase:'intervene',
    });
    return json({ success:true, data:{ session:updated, strategy: decision }, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error al seleccionar estrategia', requestId:rid },500,cors); }
}

// POST /api/mh/cbt/sessions/:id/practice — registra práctica (experiment)
export async function handleCbtPractice(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const segs=new URL(request.url).pathname.split('/'); const id=parseInt(segs[segs.length-2],10);
    const vId=validateId(id); if(!vId.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const existing=await cbtRepo.getCbtSessionById(env,user.id,vId.data);
    if(!existing) return json({ success:false, error:'Sesión no encontrada', requestId:rid },404,cors);
    const crisis=checkCrisisGate(existing.before_score, existing.emotion_intensity, null);
    if(crisis.crisis) return json({ success:false, error:'Crisis gate activo', safety_message:crisis.message, crisis:true, requestId:rid },409,cors);
    const body=await request.json().catch(()=> ({})) as Record<string,unknown>;
    const exp = body['experiment'] !== undefined ? String(body['experiment']).slice(0,2000) : existing.experiment;
    void nextPhase;
    const updated=await cbtRepo.updateCbtSession(env,user.id,vId.data,{ experiment: exp ?? null, phase:'practice' });
    return json({ success:true, data:updated, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error', requestId:rid },500,cors); }
}

// POST /api/mh/cbt/sessions/:id/reevaluate — before → after + insight + next_step
export async function handleCbtReevaluate(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const segs=new URL(request.url).pathname.split('/'); const id=parseInt(segs[segs.length-2],10);
    const vId=validateId(id); if(!vId.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const existing=await cbtRepo.getCbtSessionById(env,user.id,vId.data);
    if(!existing) return json({ success:false, error:'Sesión no encontrada', requestId:rid },404,cors);
    if(existing.before_score === null) return json({ success:false, error:'before_score requerido antes de reevaluar', requestId:rid },400,cors);
    const body=await request.json().catch(()=> ({}));
    const v=validateCbtReevaluate(body);
    if(!v.valid) return json({ success:false, error:v.error, requestId:rid },400,cors);
    const delta=computeCbtDelta(existing.before_score, v.data.after_score);
    const insight=buildCbtInsight(delta, existing.before_score, v.data.after_score);
    const next_step= delta < 0 ? 'Continúa practicando la estrategia que te funcionó; registra tu próxima observación.' : 'Prueba ajustar el pensamiento alternativo o el experimento y vuelve a registrar.';
    const updated=await cbtRepo.updateCbtSession(env,user.id,vId.data,{
      after_score: v.data.after_score,
      delta,
      insight,
      next_step,
      experiment_outcome: v.data.experiment_outcome ?? existing.experiment_outcome,
      phase:'reevaluate',
      status:'completed',
    });
    // También crear session de intervención si hay intervention_id (reutiliza before/after flow)
    if(existing.intervention_id){
      const delta2=computeCbtDelta(existing.before_score, v.data.after_score);
      await mhRepo.createSession(env,user.id,{
        intervention_id: existing.intervention_id as number,
        before_intensity: existing.before_score as number,
        after_intensity: v.data.after_score,
        delta: delta2,
        completion:1,
        duration_sec:null,
        feedback:null,
        note: `CBT session ${existing.id}: ${insight}`,
      });
    }
    return json({ success:true, data:{ session:updated, delta, insight, next_step, disclaimer:'Observación, no diagnóstico.' }, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error en reevaluación', requestId:rid },500,cors); }
}

// DELETE /api/mh/cbt/sessions/:id
export async function handleCbtDeleteSession(env: Env, request: Request, user: User, cors: Record<string,string>): Promise<Response> {
  const rid=getRequestId();
  try {
    const id=parseInt(new URL(request.url).pathname.split('/').pop()||'',10);
    const v=validateId(id); if(!v.valid) return json({ success:false, error:'id inválido', requestId:rid },400,cors);
    const ok=await cbtRepo.deleteCbtSession(env,user.id,v.data);
    if(!ok) return json({ success:false, error:'Sesión no encontrada', requestId:rid },404,cors);
    return json({ success:true, data:{ deleted:true }, requestId:rid },200,cors);
  } catch(e){ console.error(e); return json({ success:false, error:'Error', requestId:rid },500,cors); }
}
