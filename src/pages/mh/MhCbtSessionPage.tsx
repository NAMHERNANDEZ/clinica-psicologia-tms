import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cbt, mh } from '../../lib/api';

const PHASES = ['listen','reflect','validate','explore','formulate','intervene','practice','reevaluate','next_step','closure'];

export default function MhCbtSessionPage() {
  const { id } = useParams<{ id:string }>();
  const sid = parseInt(id||'0',10);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);

  // form fields
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [emotion, setEmotion] = useState('');
  const [emotionInt, setEmotionInt] = useState<number>(5);
  const [behavior, setBehavior] = useState('');
  const [evidenceFor, setEvidenceFor] = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');
  const [balanced, setBalanced] = useState('');
  const [experiment, setExperiment] = useState('');
  const [afterScore, setAfterScore] = useState<number>(5);
  const [catalog, setCatalog] = useState<any[]>([]);

  const load = async () => {
    try {
      const res = await cbt.get(sid);
      const s = res.data;
      setSession(s);
      setSituation(s.situation||'');
      setThought(s.automatic_thought||'');
      setEmotion(s.emotion||'');
      setEmotionInt(s.emotion_intensity||5);
      setBehavior(s.behavior||'');
      setEvidenceFor(s.evidence_for||'');
      setEvidenceAgainst(s.evidence_against||'');
      setBalanced(s.balanced_thought||'');
      setExperiment(s.experiment||'');
      setAfterScore(s.after_score||5);
      const inter = await mh.interventions(); setCatalog(inter.data||[]);
    } catch(e){ setError(e instanceof Error? e.message:'Error'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); }, [sid]);

  const patch = async (data: Record<string,unknown>) => {
    setSaving(true); setError(''); setInfo('');
    try{ const r=await cbt.patch(sid,data); setSession(r.data); setInfo('Guardado · recarga para verificar persistencia'); }
    catch(e){ setError(e instanceof Error? e.message:String(e)); }
    finally{ setSaving(false); }
  };
  const saveFormulation = async () => {
    setSaving(true); setError(''); setInfo('');
    try{
      await cbt.formulate(sid,{ situation, automatic_thought:thought, emotion, emotion_intensity: emotionInt, behavior, evidence_for: evidenceFor, evidence_against: evidenceAgainst, balanced_thought: balanced, experiment });
      await load(); setInfo('Formulación guardada → fase formulate');
    } catch(e){ setError(e instanceof Error? e.message:String(e)); } finally{ setSaving(false); }
  };
  const doStrategy = async () => {
    setSaving(true); setError(''); setInfo('');
    try{ const r=await cbt.strategy(sid); setSession(r.data.session); setInfo(`Estrategia: ${r.data.strategy.selected_strategy} → ${r.data.strategy.intervention_slug} (${r.data.strategy.reason})`); }
    catch(e){ const msg=e instanceof Error? e.message:String(e); setError(msg.includes('Crisis')? '⚠️ Gate de seguridad activo: intensidad muy alta. Busca apoyo inmediato.' : msg); }
    finally{ setSaving(false); }
  };
  const doPractice = async () => {
    setSaving(true); setError(''); setInfo('');
    try{ const r=await cbt.practice(sid, experiment); setSession(r.data); setInfo('Práctica registrada → practice'); }
    catch(e){ setError(e instanceof Error? e.message:String(e)); } finally{ setSaving(false); }
  };
  const doReevaluate = async () => {
    setSaving(true); setError(''); setInfo('');
    try{ const r=await cbt.reevaluate(sid,{ after_score:afterScore, experiment_outcome: experiment }); setSession(r.data.session); setInfo(`Reevaluado Δ ${r.data.delta}: ${r.data.insight} · Siguiente: ${r.data.next_step}`); }
    catch(e){ setError(e instanceof Error? e.message:String(e)); } finally{ setSaving(false); }
  };

  if(loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  if(!session) return <div className="rounded-xl bg-rose-50 p-4 text-rose-700">{error || 'No encontrada'} <Link to="/mh/cbt" className="underline">Volver</Link></div>;

  const phaseIdx = PHASES.indexOf(session.phase);
  return (
    <div className="space-y-5">
      <Link to="/mh/cbt" className="text-sm text-teal-600">← Volver a sesiones</Link>
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex justify-between items-start">
          <h1 className="font-bold text-slate-800">Sesión CBT #{session.id}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700">{session.phase} · {session.status}</span>
        </div>
        <div className="mt-2 flex gap-1 flex-wrap">
          {PHASES.map((p,i)=> <span key={p} className={`text-xs px-2 py-1 rounded-full border ${i<=phaseIdx? 'bg-teal-600 text-white border-teal-600':'bg-slate-50 text-slate-400 border-slate-200'}`}>{p}</span>)}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          before {session.before_score ?? '—'} → after {session.after_score ?? '—'} Δ {session.delta ?? '—'} · estrategia {session.selected_strategy||'—'} · intervención {session.intervention_slug||'—'}
        </div>
        {session.insight && <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">💡 {session.insight}</div>}
        {session.next_step && <div className="mt-2 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">→ {session.next_step}</div>}
        <p className="mt-2 text-xs text-slate-400">Esta formulación no es diagnóstico clínico. Si intensidad ≥9, gate de seguridad pausa la intervención.</p>
      </div>

      {info && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{info}</div>}
      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</div>}

      {/* Fase 1-4: Identificar situación/pensamiento/emoción/conducta */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">1) Formulación — situación, pensamiento, emoción, conducta</h2>
        <label className="block text-sm">Situación<textarea value={situation} onChange={e=> setSituation(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" placeholder="¿Dónde estabas? ¿Qué ocurrió?" /></label>
        <label className="block text-sm">Pensamiento automático<textarea value={thought} onChange={e=> setThought(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" placeholder="¿Qué pasó por tu mente?" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Emoción<input value={emotion} onChange={e=> setEmotion(e.target.value)} className="w-full mt-1 border rounded-xl p-2" placeholder="ansiedad, tristeza..." /></label>
          <label className="block text-sm">Intensidad emoción {emotionInt}/10<input type="range" min={1} max={10} value={emotionInt} onChange={e=> setEmotionInt(parseInt(e.target.value))} className="w-full" /></label>
        </div>
        <label className="block text-sm">Conducta<textarea value={behavior} onChange={e=> setBehavior(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" placeholder="¿Qué hiciste? ¿Evitación?" /></label>
        <label className="block text-sm">Evidencia a favor<textarea value={evidenceFor} onChange={e=> setEvidenceFor(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" /></label>
        <label className="block text-sm">Evidencia en contra<textarea value={evidenceAgainst} onChange={e=> setEvidenceAgainst(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" /></label>
        <label className="block text-sm">Pensamiento equilibrado<textarea value={balanced} onChange={e=> setBalanced(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" /></label>
        <label className="block text-sm">Experimento/práctica<textarea value={experiment} onChange={e=> setExperiment(e.target.value)} rows={2} className="w-full mt-1 border rounded-xl p-2" placeholder="¿Qué harás para probar el pensamiento alternativo?" /></label>
        <button onClick={saveFormulation} disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-semibold disabled:opacity-50">Guardar formulación (formulate)</button>
      </section>

      {/* Estrategia */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">2) Estrategia → intervención existente</h2>
        <p className="text-sm text-slate-500">El mapper elige una de las intervenciones del catálogo reutilizado: {catalog.map(c=> c.slug).join(', ')}</p>
        <button onClick={doStrategy} disabled={saving} className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50">Seleccionar estrategia (intervene)</button>
        {session.intervention_slug && <div className="text-sm p-2 rounded-xl bg-teal-50 border border-teal-200">Elegida: <strong>{session.intervention_slug}</strong> ({session.selected_strategy})</div>}
        <div className="flex gap-2">
          <button onClick={doPractice} disabled={saving} className="flex-1 py-2 rounded-xl border border-slate-300 text-sm">Registrar práctica (practice)</button>
          <button onClick={()=> patch({ phase:'next_step' })} disabled={saving} className="flex-1 py-2 rounded-xl border border-slate-300 text-sm">Avanzar fase</button>
        </div>
      </section>

      {/* Reevaluación */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">3) Reevaluación before → after</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm">before {session.before_score ?? '—'}</span>
          <span>→</span>
          <input type="range" min={1} max={10} value={afterScore} onChange={e=> setAfterScore(parseInt(e.target.value))} className="flex-1" />
          <span className="font-bold text-teal-600">{afterScore}</span>
        </div>
        <button onClick={doReevaluate} disabled={saving || session.before_score===null} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50">Reevaluar (reevaluate → insight + next_step)</button>
        <button onClick={load} className="w-full py-2 rounded-xl border border-slate-300 text-sm">↻ Recargar y verificar persistencia</button>
        <button onClick={async()=>{ if(confirm('¿Eliminar sesión CBT?')){ await cbt.remove(sid); window.location.href='/mh/cbt'; } }} className="w-full py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">Eliminar sesión (cleanup)</button>
      </section>
    </div>
  );
}
