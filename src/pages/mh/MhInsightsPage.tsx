import { useEffect, useState, useCallback } from 'react';
import { mh, type MhInsight } from '../../lib/api';

export default function MhInsightsPage() {
  const [items, setItems] = useState<MhInsight[]>([]);
  const [error, setError] = useState('');
  const [dismissing, setDismissing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await mh.insights();
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar insights');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = async (id: number) => {
    setDismissing(id);
    try {
      await mh.dismissInsight(id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'dismissed' } : i));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descartar');
    } finally {
      setDismissing(null);
    }
  };

  const open = items.filter(i => i.status === 'open');
  const dismissed = items.filter(i => i.status !== 'open');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Insights</h1>
        <p className="text-sm text-slate-500">
          Patrones detectados en tu historial. Son observaciones trazables, no diagnósticos.
        </p>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">{error}</div>}

      {open.length === 0 && dismissed.length === 0 && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-500">
          Todavía no hay suficientes registros para detectar patrones.
          Continúa con tus check-ins y sesiones; los insights aparecerán aquí automáticamente.
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Nuevos</h2>
          {open.map((ins) => (
            <div key={ins.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{ins.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{ins.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100">Confianza {Math.round(ins.confidence * 100)}%</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100">{ins.observation_count} observaciones</span>
                  </div>
                </div>
                <button
                  onClick={() => dismiss(ins.id)}
                  disabled={dismissing === ins.id}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dismissed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400">Descartados</h2>
          {dismissed.map((ins) => (
            <div key={ins.id} className="rounded-2xl bg-white border border-slate-100 p-4 opacity-70">
              <div className="font-semibold text-slate-600 text-sm">{ins.title}</div>
              <p className="mt-1 text-sm text-slate-500">{ins.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}