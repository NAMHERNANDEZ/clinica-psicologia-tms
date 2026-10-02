// E2E PRODUCCION — MH-EXPANSION 1.2 (CBT integrado)
// Flujo: register -> login -> assessment wellbeing -> checkin -> CBT create -> formulate
//        -> strategy -> practice -> reevaluate (delta/insight) -> persistencia -> aislamiento
//        -> safety gate 409 -> export -> cleanup (delete account)
// Uso: node scripts/e2e-mh12-cbt-prod.cjs
'use strict';

const BASE = process.env.E2E_BASE || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const ts = Date.now();
const EMAIL_A = `e2e-cbt-a-${ts}@probe.invalid`;
const EMAIL_B = `e2e-cbt-b-${ts}@probe.invalid`;
const PASSPROBE = `Probe#${ts}x`; // credencial desechable de prueba, no un secreto real

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function api(method, path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin body */ }
  return { status: res.status, json, setCookie: res.headers.getSetCookie ? res.headers.getSetCookie() : [] };
}

async function registerAndLogin(email, label) {
  const reg = await api('POST', '/api/auth/register', {
    body: { email, password: PASSPROBE, name: `E2E CBT ${label}`, clinic_name: `E2E Probe Clinic ${label}` },
  });
  if (reg.status !== 201 || !reg.json?.success) return { error: `register ${reg.status}: ${JSON.stringify(reg.json)?.slice(0, 120)}` };
  const login = await api('POST', '/api/auth/login', { body: { email, password: PASSPROBE } });
  if (login.status !== 200 || !login.json?.success) return { error: `login ${login.status}` };
  const cookie = login.setCookie.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) return { error: 'login sin cookie' };
  return { cookie };
}

(async () => {
  // ---- Usuario A ----
  const a = await registerAndLogin(EMAIL_A, 'A');
  if (a.error) { check('A register+login', false, a.error); process.exit(1); }
  check('A register+login (cookie)', true);

  // 1) Assessment wellbeing real (pss4)
  const scales = await api('GET', '/api/assessments/wellbeing/scales', { cookie: a.cookie });
  const pss4 = scales.json?.data?.scales?.find((s) => s.id === 'stress-pss4' || s.scale_id === 'stress-pss4')
    || (Array.isArray(scales.json?.data) ? scales.json.data.find((s) => (s.id || s.scale_id) === 'stress-pss4') : null);
  check('assessment: escalas wellbeing disponibles', !!pss4, pss4 ? 'stress-pss4' : JSON.stringify(scales.json).slice(0, 120));

  const wa = await api('POST', '/api/assessments/wellbeing', {
    cookie: a.cookie,
    body: { scale_id: 'stress-pss4', responses: [ { item_id: 'pss4-1', value: 3 }, { item_id: 'pss4-2', value: 3 }, { item_id: 'pss4-3', value: 1 }, { item_id: 'pss4-4', value: 1 } ] },
  });
  const waId = wa.json?.data?.id ?? wa.json?.data?.assessment?.id;
  const waScore = wa.json?.data?.score ?? wa.json?.data?.assessment?.score;
  check('assessment: pss4 creado', wa.status === 201 && waId != null, `id=${waId} score=${waScore} status=${wa.status}`);

  // 2) Check-in (contexto)
  const ci = await api('POST', '/api/mh/checkins', {
    cookie: a.cookie,
    body: { emotional_state: 'anxious', intensity: 7, activation: 6, energy: 5, concentration: 5, sleep_hours: 6, context: 'e2e-1.2', note: 'probe' },
  });
  const ciId = ci.json?.data?.id ?? ci.json?.data?.checkin?.id;
  check('check-in creado', (ci.status === 201 || ci.status === 200) && ciId != null, `id=${ciId} status=${ci.status}`);

  // 3) CBT create con contexto del assessment (assessment -> sesión CBT)
  const ctx = JSON.stringify({ source: 'e2e-1.2', assessment_id: waId, scale: 'stress-pss4', score: waScore, checkin_id: ciId });
  const cs = await api('POST', '/api/mh/cbt/sessions', {
    cookie: a.cookie,
    body: { linked_checkin_id: ciId, before_score: 7, context_json: ctx },
  });
  const sid = cs.json?.data?.session?.id;
  check('cbt: sesión creada', cs.status === 201 && sid != null, `id=${sid} safety.crisis=${cs.json?.data?.safety?.crisis} status=${cs.status}`);
  if (!sid) { console.log(JSON.stringify(cs.json).slice(0, 200)); process.exit(1); }

  // 4) Formulate (formulación completa)
  const fm = await api('POST', `/api/mh/cbt/sessions/${sid}/formulate`, {
    cookie: a.cookie,
    body: {
      situation: 'Presentación importante mañana',
      automatic_thought: 'Siempre fracaso, no puedo hacerlo',
      emotion: 'ansiedad',
      emotion_intensity: 7,
      behavior: 'Evito preparar la presentación',
      evidence_for: 'Una vez me puse muy nervioso',
      evidence_against: 'He presentado bien antes varias veces',
      balanced_thought: 'A veces fallo, pero normalmente me va bien',
    },
  });
  check('cbt: formulación guardada (phase=formulate)', fm.status === 200 && fm.json?.data?.phase === 'formulate', `phase=${fm.json?.data?.phase}`);

  // 5) Strategy (mapper determinista -> intervención existente del catálogo)
  const st = await api('POST', `/api/mh/cbt/sessions/${sid}/strategy`, { cookie: a.cookie });
  const strat = st.json?.data?.strategy;
  const sess5 = st.json?.data?.session;
  check('cbt: estrategia mapeada a intervención existente', st.status === 200 && !!strat?.intervention_slug,
    `strategy=${strat?.selected_strategy} slug=${strat?.intervention_slug} conf=${strat?.confidence}`);
  check('cbt: strategy esperada por pensamiento dicotómico (pensamiento-cbt)', strat?.intervention_slug === 'pensamiento-cbt',
    `slug=${strat?.intervention_slug}`);
  check('cbt: fase avanzada a intervene', sess5?.phase === 'intervene', `phase=${sess5?.phase} intervention_id=${sess5?.intervention_id}`);

  // 6) Practice
  const pr = await api('POST', `/api/mh/cbt/sessions/${sid}/practice`, {
    cookie: a.cookie, body: { experiment: 'Registrar evidencia real antes de la presentación' },
  });
  check('cbt: práctica registrada (phase=practice)', pr.status === 200 && pr.json?.data?.phase === 'practice', `phase=${pr.json?.data?.phase}`);

  // 7) Reevaluate (before=7 -> after=4 => delta=-3 + insight + next_step + sesión MH)
  const re = await api('POST', `/api/mh/cbt/sessions/${sid}/reevaluate`, {
    cookie: a.cookie, body: { after_score: 4, experiment_outcome: 'Preparé y presenté; la ansiedad bajó' },
  });
  const reD = re.json?.data;
  check('cbt: reevaluación delta=-3', re.status === 200 && reD?.delta === -3, `delta=${reD?.delta}`);
  check('cbt: insight generado', !!reD?.insight, String(reD?.insight).slice(0, 80));
  check('cbt: next_step presente', !!reD?.next_step);
  check('cbt: sesión completada', reD?.session?.status === 'completed' && reD?.session?.phase === 'reevaluate');

  // 8) Persistencia: GET tras "recarga"
  const g = await api('GET', `/api/mh/cbt/sessions/${sid}`, { cookie: a.cookie });
  const gs = g.json?.data;
  check('cbt: persistencia tras recarga (delta+insight+balanced_thought)',
    g.status === 200 && gs?.delta === -3 && !!gs?.insight && !!gs?.balanced_thought,
    `delta=${gs?.delta} phase=${gs?.phase} status=${gs?.status}`);

  // 9) Aislamiento: usuario B no puede leer sesión de A
  const b = await registerAndLogin(EMAIL_B, 'B');
  if (b.error) { check('B register+login', false, b.error); } else {
    const iso = await api('GET', `/api/mh/cbt/sessions/${sid}`, { cookie: b.cookie });
    check('cbt: aislamiento user-scoped (B -> 404)', iso.status === 404, `status=${iso.status}`);
  }

  // 10) Safety gate: before_score>=9 bloquea strategy con 409
  const cs2 = await api('POST', '/api/mh/cbt/sessions', { cookie: a.cookie, body: { before_score: 9 } });
  const sid2 = cs2.json?.data?.session?.id;
  check('cbt: safety flag en creación (crisis=true)', cs2.json?.data?.safety?.crisis === true, `crisis=${cs2.json?.data?.safety?.crisis}`);
  const st2 = await api('POST', `/api/mh/cbt/sessions/${sid2}/strategy`, { cookie: a.cookie });
  check('cbt: safety gate bloquea strategy con 409', st2.status === 409 && st2.json?.crisis === true, `status=${st2.status}`);

  // 11) Export incluye sesiones CBT
  const ex = await api('GET', '/api/mh/export', { cookie: a.cookie });
  const exStr = JSON.stringify(ex.json || {});
  check('export: incluye cbt sessions', ex.status === 200 && (exStr.includes('"cbt"') || exStr.includes('cbt_sessions')), `bytes=${exStr.length}`);

  // 12) Cleanup
  const delA = await api('DELETE', '/api/mh/account?confirm=1', { cookie: a.cookie });
  check('cleanup A (delete account)', delA.status === 200, `status=${delA.status}`);
  const gone = await api('GET', `/api/mh/cbt/sessions/${sid}`, { cookie: a.cookie });
  check('cleanup A verificado (sesión ya no legible)', gone.status === 401 || gone.status === 404 || gone.json?.success === false, `status=${gone.status}`);
  if (!b.error) {
    const delB = await api('DELETE', '/api/mh/account?confirm=1', { cookie: b.cookie });
    check('cleanup B', delB.status === 200, `status=${delB.status}`);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\nE2E MH-EXPANSION 1.2 PRODUCCION: ${passed}/${results.length} PASS — base=${BASE}`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('E2E FATAL', e); process.exit(1); });
