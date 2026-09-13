import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mh, type MhCheckIn, type MhRecommendation } from '../../lib/api';

const MOODS = [
  { id: 'calm', label: 'Tranquilo', emoji: '😌' },
  { id: 'happy', label: 'Feliz', emoji: '😄' },
  { id: 'content', label: 'A gusto', emoji: '🙂' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
  { id: 'tired', label: 'Cansado', emoji: '🥱' },
  { id: 'sad', label: 'Triste', emoji: '😢' },
  { id: 'anxious', label: 'Ansioso', emoji: '😰' },
  { id: 'stressed', label: 'Estresado', emoji: '😣' },
  { id: 'overwhelmed', label: 'Abrumado', emoji: '😫' },
  { id: 'angry', label: 'Enojado', emoji: '😠' },
  { id: 'low', label: 'Decaído', emoji: '😔' },
] as const;

const CONTEXTS = ['trabajo', 'familia', 'salud', 'ejercicio', 'alimentación', 'sueño', 'relaciones', 'otro'];

function Slider({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-teal-600">{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-teal-600"
      />
      <div className="text-xs text-slate-400">{hint}</div>
    </div>
  );
}

export default function MhCheckinPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ checkin: MhCheckIn; recommendation: MhRecommendation } | null>(null);

  const [mood, setMood] = useState<string>('calm');
  const [intensity, setIntensity] = useState(5);
  const [activation, setActivation] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [concentration, setConcentration] = useState(5);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [contexts, setContexts] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const toggleContext = (c: string) => {
    setContexts(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await mh.createCheckin({
        emotional_state: mood,
        intensity,
        activation,
        energy,
        concentration,
        sleep_hours: sleepHours,
        context: contexts.join(','),
        note: note.trim() || undefined,
      });
      setSaved(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <h1 className="text-lg font-bold text-emerald-800">✓ Registro guardado</h1>
          <p className="mt-1 text-sm text-emerald-700">
            {new Date(saved.checkin.created_at).toLocaleString('es-MX')}
          </p>
        </div>

        <section className="rounded-2xl bg-teal-50 border border-teal-200 p-5">
          <h2 className="font-semibold text-teal-900">Sugerencia para ahora</h2>
          {saved.recommendation.safety && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
              ⚠️ {saved.recommendation.safety_message}
            </div>
          )}
          <p className="mt-2 text-sm text-slate-700">{saved.recommendation.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[saved.recommendation.intervention_slug, ...saved.recommendation.alternatives].map((slug) => (
              <Link
                key={slug}
                to={`/mh/intervenciones/${slug}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  slug === saved.recommendation.intervention_slug
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-teal-700 border border-teal-200'
                }`}
              >
                {slug === saved.recommendation.intervention_slug ? '★ ' : ''}
                {slug.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Confianza {Math.round(saved.recommendation.confidence * 100)}% · Evidencia:{' '}
            {saved.recommendation.evidence.join(', ')}
          </p>
        </section>

        <div className="flex gap-3">
          <button onClick={() => navigate('/mh')} className="flex-1 py-3 rounded-full bg-slate-100 text-slate-700 font-semibold">
            Volver al inicio
          </button>
          <button onClick={() => setSaved(null)} className="flex-1 py-3 rounded-full bg-teal-600 text-white font-semibold">
            Nuevo check-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Check-in rápido</h1>
        <p className="text-sm text-slate-500">10-30 segundos. ¿Cómo estás ahora mismo?</p>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">{error}</div>}

      {/* Estado emocional */}
      <div>
        <h2 className="text-sm font-medium text-slate-700 mb-2">1. ¿Cómo te sientes?</h2>
        <div className="grid grid-cols-4 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border p-2 transition ${
                mood === m.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[11px] text-slate-600 text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Escalas */}
      <div className="space-y-3">
        <Slider label="Intensidad de la emoción" value={intensity} onChange={setIntensity} hint="¿Qué tan fuerte?" />
        <Slider label="Ansiedad / Activación" value={activation} onChange={setActivation} hint="¿Qué tan acelerado?" />
        <Slider label="Energía" value={energy} onChange={setEnergy} hint="¿Con cuánta energía cuentas?" />
        <Slider label="Concentración" value={concentration} onChange={setConcentration} hint="¿Qué tan enfocado?" />
      </div>

      {/* Sueno */}
      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Horas de sueño (anoche)</span>
          <span className="text-sm font-bold text-teal-600">{sleepHours !== null ? `${sleepHours} h` : '—'}</span>
        </div>
        <input
          type="range" min={0} max={12} step={0.5} value={sleepHours ?? 0}
          onChange={(e) => setSleepHours(Number(e.target.value))}
          className="mt-2 w-full accent-teal-600"
        />
        {sleepHours === 0 && <button onClick={() => setSleepHours(null)} className="mt-1 text-xs text-slate-400 underline">No quiero registrarlo</button>}
      </div>

      {/* Contexto */}
      <div>
        <h2 className="text-sm font-medium text-slate-700 mb-2">Contexto (opcional)</h2>
        <div className="flex flex-wrap gap-2">
          {CONTEXTS.map((c) => (
            <button
              key={c}
              onClick={() => toggleContext(c)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                contexts.includes(c) ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Nota */}
      <div>
        <h2 className="text-sm font-medium text-slate-700 mb-2">Nota (opcional)</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="¿Qué está pasando?"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="w-full py-4 rounded-full bg-teal-600 text-white font-semibold disabled:opacity-50 shadow-lg shadow-teal-200"
      >
        {saving ? 'Guardando...' : 'Guardar registro'}
      </button>
    </div>
  );
}