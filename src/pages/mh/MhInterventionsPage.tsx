import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { mh, type MhIntervention } from '../../lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  breathing: 'Respiración',
  grounding: 'Aterrizaje',
  mindfulness: 'Atención plena',
  relaxation: 'Relajación',
  reflection: 'Reflexión',
  focus: 'Enfoque',
  sleep: 'Sueño',
};

export default function MhInterventionsPage() {
  const [items, setItems] = useState<MhIntervention[]>([]);
  const [filter, setFilter] = useState<string>('todas');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await mh.interventions();
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = ['todas', ...new Set(items.map(i => i.category))];
  const visible = filter === 'todas' ? items : items.filter(i => i.category === filter);

  if (error) {
    return <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Intervenciones</h1>
        <p className="text-sm text-slate-500">Técnicas breves basadas en evidencia. Elige y registra cómo te fue.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === c ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {c === 'todas' ? 'Todas' : CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((it) => (
          <Link
            key={it.id}
            to={`/mh/intervenciones/${it.slug}`}
            className="block rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:border-teal-300 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-800">{it.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{it.description}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 font-medium">
                ~{Math.round(it.duration_sec / 60)} min
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{CATEGORY_LABELS[it.category] ?? it.category}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Dificultad: {it.difficulty}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}