import { useEffect, useState, useCallback } from 'react';
import { mh, type MhCheckIn, type MhSession, type MhJournalEntry } from '../../lib/api';

type Tab = 'checkins' | 'sesiones' | 'diario';

const MOOD_EMOJI: Record<string, string> = {
  calm: '😌', happy: '😄', content: '🙂', neutral: '😐', sad: '😢', anxious: '😰',
  stressed: '😣', overwhelmed: '😫', angry: '😠', tired: '🥱', low: '😔',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MhHistoryPage() {
  const [tab, setTab] = useState<Tab>('checkins');
  const [checkins, setCheckins] = useState<MhCheckIn[]>([]);
  const [sessions, setSessions] = useState<MhSession[]>([]);
  const [entries, setEntries] = useState<MhJournalEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, s, j] = await Promise.all([mh.listCheckins(100), mh.sessions(100), mh.journal()]);
      setCheckins(c.data);
      setSessions(s.data);
      setEntries(j.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEntry = async () => {
    const content = draft.trim();
    if (!content || saving) return;
    setSaving(true);
    try {
      await mh.createJournal(content);
      setDraft('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'checkins', label: `Check-ins (${checkins.length})` },
    { id: 'sesiones', label: `Sesiones (${sessions.length})` },
    { id: 'diario', label: `Diario (${entries.length})` },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Historial</h1>
        <p className="text-sm text-slate-500">Todos tus registros de bienestar.</p>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">{error}</div>}

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              tab === t.id ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'checkins' && (
        <div className="space-y-3">
          {checkins.length === 0 && <div className="text-sm text-slate-400">Aún no hay check-ins.</div>}
          {checkins.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-2xl">{MOOD_EMOJI[c.emotional_state] ?? '🙂'}</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{c.emotional_state}</div>
                  <div className="text-xs text-slate-400">{fmtDate(c.created_at)}</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500">
                <span>Intensidad {c.intensity}/10</span>
                <span>Activación {c.activation}/10</span>
                <span>Energía {c.energy}/10</span>
                <span>Concentración {c.concentration}/10</span>
                {c.sleep_hours !== null && <span>Sueño {c.sleep_hours}h</span>}
                {c.context && <span>Contexto: {c.context}</span>}
              </div>
              {c.note && <p className="mt-2 text-sm text-slate-600 border-t border-slate-100 pt-2">{c.note}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'sesiones' && (
        <div className="space-y-3">
          {sessions.length === 0 && <div className="text-sm text-slate-400">Aún no hay sesiones de intervención.</div>}
          {sessions.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-800 text-sm">{s.intervention_title}</div>
                <div className={`text-sm font-bold ${s.delta < 0 ? 'text-emerald-600' : s.delta > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {s.before_intensity}/10 → {s.after_intensity}/10
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span>{fmtDate(s.created_at)}</span>
                {s.duration_sec !== null && <span>· {Math.round(s.duration_sec / 60)} min</span>}
                {s.feedback !== null && <span>· {'⭐'.repeat(s.feedback)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'diario' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <textarea
              value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
              maxLength={4000} placeholder="Escribe libremente..."
              className="w-full text-sm focus:outline-none"
            />
            <button onClick={addEntry} disabled={saving || !draft.trim()}
              className="mt-2 px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-semibold disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar entrada'}
            </button>
          </div>
          {entries.length === 0 && <div className="text-sm text-slate-400">Aún no hay entradas.</div>}
          {entries.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{e.content}</p>
              <div className="mt-2 text-xs text-slate-400">{fmtDate(e.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}