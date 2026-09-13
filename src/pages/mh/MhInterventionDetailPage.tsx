import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mh, type MhIntervention } from '../../lib/api';

type Step = 'antes' | 'practica' | 'despues' | 'resultado';

export default function MhInterventionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [item, setItem] = useState<MhIntervention | null>(null);
  const [error, setError] = useState('');

  const [step, setStep] = useState<Step>('antes');
  const [beforeIntensity, setBeforeIntensity] = useState(6);
  const [afterIntensity, setAfterIntensity] = useState(5);
  const [feedback, setFeedback] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ delta: number; observation: string; disclaimer: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      if (!slug) return;
      const res = await mh.interventions();
      const found = res.data.find(i => i.slug === slug || String(i.id) === slug);
      if (!found) {
        setError('Intervención no encontrada');
        return;
      }
      setItem(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startPractice = () => {
    setStep('practica');
    setStartedAt(Date.now());
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  };

  const finishPractice = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    setStep('despues');
  };

  const saveSession = async () => {
    if (!item || saving) return;
    setSaving(true);
    try {
      const res = await mh.createSession(item.id, {
        before_intensity: beforeIntensity,
        after_intensity: afterIntensity,
        completion: 1,
        duration_sec: elapsed,
        feedback: feedback || undefined,
      });
      setResult(res.data);
      setStep('resultado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">{error}</div>
        <Link to="/mh/intervenciones" className="text-sm text-teal-600">← Volver al catálogo</Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = item.instructions.split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div className="space-y-5 pb-10">
      <Link to="/mh/intervenciones" className="text-sm text-teal-600">← Catálogo</Link>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{item.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
        <div className="mt-2 flex gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">~{Math.round(item.duration_sec / 60)} min</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{item.difficulty}</span>
        </div>
      </div>

      {step === 'antes' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 text-sm">Pasos</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            {item.contraindications_or_limits && (
              <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                ⚠️ {item.contraindications_or_limits}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Intensidad emocional ANTES</span>
              <span className="text-sm font-bold text-teal-600">{beforeIntensity}/10</span>
            </div>
            <input type="range" min={1} max={10} value={beforeIntensity}
              onChange={(e) => setBeforeIntensity(Number(e.target.value))}
              className="mt-2 w-full accent-teal-600" />
            <p className="text-xs text-slate-400 mt-1">Registra cómo te sientes antes de empezar.</p>
            <button onClick={startPractice}
              className="mt-4 w-full py-4 rounded-full bg-teal-600 text-white font-semibold hover:bg-teal-700">
              Empezar práctica
            </button>
          </div>
        </div>
      )}

      {step === 'practica' && (
        <div className="rounded-2xl bg-teal-50 border border-teal-200 p-6 text-center">
          <div className="text-xs uppercase tracking-wide text-teal-600 font-semibold">Práctica en curso</div>
          <div className="mt-3 text-5xl font-bold text-slate-800 tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </div>
          <p className="mt-2 text-sm text-slate-500">Duración sugerida ≈ {item.duration_sec}s</p>
          <button onClick={finishPractice}
            className="mt-6 w-full py-4 rounded-full bg-teal-600 text-white font-semibold hover:bg-teal-700">
            Terminar y registrar
          </button>
        </div>
      )}

      {step === 'despues' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Intensidad emocional DESPUÉS</span>
              <span className="text-sm font-bold text-teal-600">{afterIntensity}/10</span>
            </div>
            <input type="range" min={1} max={10} value={afterIntensity}
              onChange={(e) => setAfterIntensity(Number(e.target.value))}
              className="mt-2 w-full accent-teal-600" />
            <p className="text-xs text-slate-400 mt-1">¿Cómo te sientes ahora?</p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <span className="text-sm font-medium text-slate-700">¿Cómo te resultó? (opcional)</span>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setFeedback(n)}
                  className={`w-10 h-10 rounded-full text-lg ${feedback >= n ? 'bg-amber-200' : 'bg-slate-100'}`}>
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">{error}</div>}

          <button onClick={saveSession} disabled={saving}
            className="w-full py-4 rounded-full bg-teal-600 text-white font-semibold disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar resultado'}
          </button>
        </div>
      )}

      {step === 'resultado' && result && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${result.delta < 0 ? 'bg-emerald-50 border-emerald-200' : result.delta > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-3xl font-bold text-slate-800">
              {beforeIntensity}/10 → {afterIntensity}/10
            </div>
            <p className="mt-2 text-sm text-slate-700">{result.observation}</p>
            <p className="mt-2 text-xs text-slate-400">{result.disclaimer}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/mh" className="flex-1 py-3 rounded-full bg-slate-100 text-slate-700 font-semibold text-center">
              Inicio
            </Link>
            <Link to="/mh/intervenciones" className="flex-1 py-3 rounded-full bg-teal-600 text-white font-semibold text-center">
              Otra intervención
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}