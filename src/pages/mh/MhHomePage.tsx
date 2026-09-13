import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { mh, type MhHomeData } from '../../lib/api';

const MOOD_LABELS: Record<string, { label: string; emoji: string }> = {
  calm: { label: 'Tranquilo', emoji: '😌' },
  happy: { label: 'Feliz', emoji: '😄' },
  content: { label: 'A gusto', emoji: '🙂' },
  neutral: { label: 'Neutral', emoji: '😐' },
  sad: { label: 'Triste', emoji: '😢' },
  anxious: { label: 'Ansioso', emoji: '😰' },
  stressed: { label: 'Estresado', emoji: '😣' },
  overwhelmed: { label: 'Abrumado', emoji: '😫' },
  angry: { label: 'Enojado', emoji: '😠' },
  tired: { label: 'Cansado', emoji: '🥱' },
  low: { label: 'Decaído', emoji: '😔' },
};

export default function MhHomePage() {
  const [home, setHome] = useState<MhHomeData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await mh.home();
      setHome(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">
        No se pudo cargar tu espacio: {error}
      </div>
    );
  }

  if (!home) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mood = home.today ? MOOD_LABELS[home.today.checkin.emotional_state] : null;

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <section>
        <h1 className="text-2xl font-bold text-slate-800">Hola</h1>
        <p className="text-slate-500 text-sm mt-1">¿Cómo te sientes ahora?</p>
        <Link
          to="/mh/checkin"
          className="mt-4 block w-full text-center py-4 rounded-2xl bg-teal-600 text-white font-semibold shadow-lg shadow-teal-200 hover:bg-teal-700 transition"
        >
          ✦ Hacer check-in · 30 segundos
        </Link>
      </section>

      {/* Estado actual */}
      {home.today ? (
        <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Hoy</h2>
            <span className="text-xs text-slate-400">
              {new Date(home.today.checkin.created_at).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-4xl">{mood?.emoji ?? '🙂'}</span>
            <div>
              <div className="font-medium text-slate-800">{mood?.label ?? home.today.checkin.emotional_state}</div>
              <div className="text-sm text-slate-500">
                Intensidad {home.today.checkin.intensity}/10 · Activación {home.today.checkin.activation}/10
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-400">Energía</span> {home.today.checkin.energy}/10
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-400">Concentración</span> {home.today.checkin.concentration}/10
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-400">Sueño</span> {home.today.checkin.sleep_hours !== null ? `${home.today.checkin.sleep_hours} h` : '—'}
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-400">Registros</span> {home.stats.checkinsTotal}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-white border border-slate-200 p-5 text-slate-600 text-sm">
          Aún no has hecho tu primer check-in. Regístralo en 30 segundos y el motor empezará a sugerirte
          intervenciones basadas en <strong>tu</strong> historial. Empieza pequeño: un registro al día es suficiente.
        </section>
      )}

      {/* Lo que necesito ahora (recomendacion) */}
      {home.today?.recommendation && (
        <section className="rounded-2xl p-5 bg-teal-50 border border-teal-200">
          <h2 className="font-semibold text-teal-900">Sugerencia para ahora</h2>
          {home.today.recommendation.safety && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
              ⚠️ {home.today.recommendation.safety_message}
            </div>
          )}
          <p className="mt-2 text-sm text-slate-700">{home.today.recommendation.reason}</p>
          {(() => {
            const slug = home.today.recommendation.intervention_slug;
            const found = home.interventions.find(i => i.slug === slug);
            return found ? (
              <Link
                to={`/mh/intervenciones/${found.slug}`}
                className="mt-4 inline-block px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
              >
                Ir a: {found.title} · ~{Math.round(found.duration_sec / 60)} min
              </Link>
            ) : null;
          })()}
          <p className="mt-3 text-xs text-slate-400">
            Confianza {Math.round(home.today.recommendation.confidence * 100)}% · Evidencia:{' '}
            {home.today.recommendation.evidence.join(', ')}
          </p>
        </section>
      )}

      {/* Lo que aprendi (insights) */}
      {home.insightsPreview.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">💡 Lo que aprendiste</h2>
            <Link to="/mh/insights" className="text-sm text-teal-600">Ver todos</Link>
          </div>
          <div className="mt-3 space-y-3">
            {home.insightsPreview.map((ins) => (
              <div key={ins.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="font-medium text-slate-800 text-sm">{ins.title}</div>
                <p className="mt-1 text-sm text-slate-600">{ins.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Estadisticas */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 text-sm">Ritmo</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 py-3">
            <div className="text-2xl font-bold text-teal-600">{home.stats.streak}</div>
            <div className="text-xs text-slate-400">Racha (días)</div>
          </div>
          <div className="rounded-xl bg-slate-50 py-3">
            <div className="text-2xl font-bold text-slate-700">{home.stats.dayCount}</div>
            <div className="text-xs text-slate-400">Días registrados</div>
          </div>
          <div className="rounded-xl bg-slate-50 py-3">
            <div className="text-2xl font-bold text-slate-700">{home.stats.sessionsCompleted}</div>
            <div className="text-xs text-slate-400">Intervenciones</div>
          </div>
        </div>
      </section>
    </div>
  );
}