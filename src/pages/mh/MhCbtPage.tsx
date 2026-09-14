import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cbt, mh } from '../../lib/api';

export default function MhCbtPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [beforeScore, setBeforeScore] = useState<number>(5);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await cbt.list();
      setSessions(res.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      // context builder: pull latest checkin for context
      let ctx: string | null = null;
      let linkedId: number | null = null;
      try {
        const home = await mh.home();
        if (home.data.today?.checkin) {
          linkedId = home.data.today.checkin.id;
          ctx = JSON.stringify({ intensity: home.data.today.checkin.intensity, activation: home.data.today.checkin.activation, sleep_hours: home.data.today.checkin.sleep_hours });
        }
      } catch {}
      const res = await cbt.create({ before_score: beforeScore, linked_checkin_id: linkedId, context_json: ctx });
      navigate(`/mh/cbt/${res.data.session.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al crear sesión'); }
    finally { setCreating(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Sesiones CBT</h1>
      <p className="text-sm text-slate-500">Formulación estructurada: situación → pensamiento → emoción → conducta → evidencia → alternativa → experimento → reevaluación. No constituye diagnóstico.</p>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Intensidad inicial (1-10)</label>
          <input type="range" min={1} max={10} value={beforeScore} onChange={e=> setBeforeScore(parseInt(e.target.value))} className="flex-1" />
          <span className="font-bold text-teal-600 w-8 text-center">{beforeScore}</span>
        </div>
        <button onClick={handleCreate} disabled={creating} className="py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50">
          {creating ? 'Creando...' : '＋ Iniciar sesión CBT'}
        </button>
        <span className="text-xs text-slate-400">Se vinculará tu último check-in si existe. Flujo: listen → closure con safety gate.</span>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</div>}

      <div className="space-y-2">
        {sessions.length === 0 ? <div className="text-sm text-slate-400 text-center py-8">Aún no hay sesiones CBT. Inicia la primera.</div> :
          sessions.map(s => (
            <Link key={s.id} to={`/mh/cbt/${s.id}`} className="block rounded-xl bg-white border border-slate-200 p-4 hover:border-teal-300 transition">
              <div className="flex justify-between">
                <span className="font-medium text-slate-800">Sesión #{s.id} · {s.phase} · {s.status}</span>
                <span className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('es-MX')}</span>
              </div>
              <div className="text-sm text-slate-600 truncate">{s.situation || s.automatic_thought || '— sin formulación aún'}</div>
              <div className="text-xs text-slate-400 mt-1">Estrategia: {s.selected_strategy || '—'} · Intervención: {s.intervention_slug || '—'} · {s.before_score ?? '—'} → {s.after_score ?? '—'} Δ {s.delta ?? '—'}</div>
            </Link>
          ))}
      </div>
    </div>
  );
}
