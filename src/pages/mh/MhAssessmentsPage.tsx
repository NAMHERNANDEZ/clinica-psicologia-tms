import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { wellbeing, type WellbeingScale, type WellbeingAssessmentListItem } from '../../lib/api';
import { Clock, ListChecks, Sparkles, RotateCcw, ChevronRight } from 'lucide-react';

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function bandColor(band: string | null): string {
  switch (band) {
    case 'high': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'moderate': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-rose-600 bg-rose-50 border-rose-200';
    case 'good': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'fair': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'poor': return 'text-rose-600 bg-rose-50 border-rose-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export default function MhAssessmentsPage() {
  const [scales, setScales] = useState<WellbeingScale[]>([]);
  const [history, setHistory] = useState<WellbeingAssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cat, hist] = await Promise.all([wellbeing.scales(), wellbeing.list()]);
      setScales(cat.success && Array.isArray(cat.data) ? cat.data : []);
      setHistory(hist.success && Array.isArray(hist.data) ? hist.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar las evaluaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lastByScale = (scaleId: string): WellbeingAssessmentListItem | undefined =>
    history.find((h) => h.scale_id === scaleId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Evaluaciones de bienestar</h1>
        <p className="text-sm text-slate-500 mt-1">
          Autoevaluaciones breves sobre cómo te sientes. Tus respuestas y resultados son personales y no reemplazan
          una valoración profesional.
        </p>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400" aria-live="polite">
          <span className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mr-2" />
          Cargando evaluaciones…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          <p className="font-medium">No pudimos cargar las evaluaciones.</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm hover:bg-rose-700"
          >
            <RotateCcw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <section aria-labelledby="catalogo-title">
            <h2 id="catalogo-title" className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Catálogo
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {scales.length === 0 && (
                <p className="col-span-full text-sm text-slate-400">No hay evaluaciones disponibles por ahora.</p>
              )}
              {scales.map((s) => {
                const last = lastByScale(s.id);
                return (
                  <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-800">{s.name}</h3>
                        <p className="text-xs text-slate-400">{s.condition}</p>
                      </div>
                      <span className="rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-[11px] font-medium">
                        {s.time_to_complete}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 flex-1">{s.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> {s.item_count} preguntas</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> máx. {s.max_score} pts</span>
                    </div>
                    {last && (
                      <p className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${bandColor(last.band)}`}>
                        Última: {last.score}/{last.max_score} · {fmtDate(last.administered_at)}
                      </p>
                    )}
                    <Link
                      to={`/mh/assessments/${s.id}`}
                      className="mt-4 inline-flex items-center justify-center gap-1 rounded-xl bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                      aria-label={`Iniciar evaluación ${s.name}`}
                    >
                      <Sparkles className="w-4 h-4" /> Iniciar
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="historial-title">
            <h2 id="historial-title" className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Mis resultados
            </h2>
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
                Aún no has realizado ninguna evaluación de bienestar.
              </div>
            ) : (
              <ul className="space-y-2" data-testid="wellbeing-history">
                {history.map((h) => (
                  <li key={h.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{h.scale_name}</p>
                        <p className="text-xs text-slate-400">{fmtDate(h.administered_at)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${bandColor(h.band)}`}>
                          {h.interpretation}
                        </span>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {h.score}<span className="text-slate-400 font-normal">/{h.max_score}</span>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}