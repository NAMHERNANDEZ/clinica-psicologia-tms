import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { wellbeing, sendChatMessage, type WellbeingScale, type WellbeingScorePreview, type WellbeingCreateResult, type WellbeingAssessmentDetail } from '../../lib/api';
import {
  getWellbeingQuestions,
  buildResponses,
  isWellbeingComplete,
  type WellbeingAnswers,
} from '../../lib/wellbeing-questions';
import { ChevronLeft, ChevronRight, Sparkles, Save, AlertTriangle, Send, Bot, RotateCcw } from 'lucide-react';

type Phase = 'answering' | 'preview' | 'saving' | 'result';

interface ChatTurn { role: 'user' | 'ai'; text: string }

const DISCLAIMER = 'Esta es una autoevaluación de bienestar y no constituye un diagnóstico ni sustituye una valoración profesional.';

function severityColor(severity: string): string {
  if (severity === 'high' || severity === 'poor') return '#EF4444';
  if (severity === 'low') return '#EF4444';
  if (severity === 'moderate' || severity === 'fair') return '#F59E0B';
  return '#22C55E'; // good, high-who5 (dirección positiva)
}

export default function MhAssessmentRunPage() {
  const { scaleId = '' } = useParams();
  const navigate = useNavigate();

  const [scale, setScale] = useState<WellbeingScale | null>(null);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WellbeingAnswers>({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [preview, setPreview] = useState<WellbeingScorePreview | null>(null);
  const [result, setResult] = useState<WellbeingCreateResult | null>(null);
  const [persisted, setPersisted] = useState<WellbeingAssessmentDetail | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cargar metadatos reales de la escala desde el backend (no hardcodeados)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await wellbeing.scales();
        if (!active) return;
        const found = (res.success ? res.data : []).find((s) => s.id === scaleId);
        if (found) setScale(found);
        else setLoadError('Evaluación no encontrada en el catálogo de bienestar.');
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : 'Error al cargar la evaluación');
      }
    })();
    return () => { active = false; };
  }, [scaleId]);

  const questions = useMemo(() => getWellbeingQuestions(scaleId), [scaleId]);

  // Restaurar / persistir respuestas en sesión (evita pérdida por recarga/navegación)
  const draftKey = `wb-draft:${scaleId}`;
  useEffect(() => {
    const raw = sessionStorage.getItem(draftKey);
    if (raw) {
      try { setAnswers((prev) => ({ ...prev, ...JSON.parse(raw) })); } catch { /* draft corrupto se ignora */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleId]);

  useEffect(() => {
    if (phase === 'answering') sessionStorage.setItem(draftKey, JSON.stringify(answers));
    else sessionStorage.removeItem(draftKey);
  }, [answers, phase, draftKey]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatOpen, turns]);

  const complete = isWellbeingComplete(scaleId, answers);
  const total = questions.length;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const progress = total === 0 ? 0 : Math.round(((step + 1) / total) * 100);
  const finalAnswered = total > 0 && step === total - 1;

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-3" />
        <h1 className="text-xl font-bold text-slate-800">No pudimos abrir la evaluación</h1>
        <p className="text-sm text-slate-500 mt-2">{loadError}</p>
        <Link to="/mh/assessments" className="mt-5 inline-block rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-semibold">
          Volver a evaluaciones
        </Link>
      </div>
    );
  }

  if (!scale && !loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center text-slate-400" aria-live="polite">
        <span className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mr-2" />
        Cargando evaluación…
      </div>
    );
  }

  const handleSelect = (itemId: string, value: number) => {
    if (busy) return;
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const goNext = () => {
    if (step < total - 1) { setStep(step + 1); setActionError(''); }
  };
  const goPrev = () => { if (step > 0) { setStep(step - 1); setActionError(''); } };

  const handlePreview = async () => {
    if (!complete || busy) return;
    setBusy(true); setActionError('');
    try {
      const res = await wellbeing.preview(scaleId, buildResponses(scaleId, answers));
      if (!res.success) throw new Error('No se pudo calcular el resultado');
      setPreview(res.data);
      setPhase('preview');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo calcular el resultado. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  const setPrevStepAfterReview = () => {
    setPhase('answering');
    setActionError('');
    if (total > 0) setStep(total - 1);
  };

  const handleComplete = async () => {
    if (!complete || busy) return;
    setBusy(true); setActionError(''); setPhase('saving');
    try {
      const responses = buildResponses(scaleId, answers);
      const res = await wellbeing.complete({ scale_id: scaleId, responses, provenance: 'user_self_report' });
      if (!res.success || !res.data?.id) throw new Error('El servidor no guardó la evaluación');
      setResult(res.data);
      // Verificar persistencia: GET real del detalle guardado
      try {
        const det = await wellbeing.detail(res.data.id);
        setPersisted(det.success ? det.data : null);
      } catch {
        setPersisted(null); // el POST fue exitoso; se muestra aviso no bloqueante
      }
      setPhase('result');
    } catch (e) {
      setPhase('preview');
      setActionError(e instanceof Error ? e.message : 'No se pudo guardar la evaluación. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setAnswers({});
    sessionStorage.removeItem(draftKey);
    setPhase('answering');
    setStep(0);
    setPreview(null);
    setResult(null);
    setPersisted(null);
    setActionError('');
  };

  const sendChat = async () => {
    const text = chatText.trim();
    if (!text || chatBusy) return;
    setTurns((t) => [...t, { role: 'user', text }]);
    setChatText('');
    setChatBusy(true);
    setChatError('');
    try {
      const res = await sendChatMessage(text);
      setTurns((t) => [...t, { role: 'ai', text: res.message || 'Sin respuesta. Intenta de nuevo.' }]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'No se pudo conectar con la IA');
      setTurns((t) => [...t, { role: 'ai', text: 'No pude conectarme ahora. Intenta de nuevo en unos segundos.' }]);
    } finally {
      setChatBusy(false);
    }
  };

  const q = questions[step];
  const resultScore: number = (result?.score ?? persisted?.assessment.score) ?? 0;
  const resultMax: number = (result?.max_score ?? persisted?.assessment.max_score) ?? 0;
  const resultInterpretation: string = (result?.interpretation ?? persisted?.assessment.interpretation) ?? '';
  const resultBand: string | null = (result?.band ?? persisted?.assessment.band) ?? null;
  const resultColor = result?.cutoff?.color || (persisted ? severityColor(resultBand || '') : '#22C55E');
  const resultRec = result?.cutoff?.recommendation || (persisted?.assessment.interpretation !== resultInterpretation ? persisted?.assessment.interpretation : '') || '';
  const resultDate = persisted?.assessment.administered_at || '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {phase === 'result' ? (
        <div data-testid="wb-result" className="space-y-5">
          <header>
            <h1 className="text-xl font-bold text-slate-800">Resultado registrado</h1>
            <p className="text-sm text-slate-500 mt-1">{scale?.name} · {scale?.condition}</p>
            {resultDate && <p className="text-xs text-slate-400 mt-1">{new Date(resultDate).toLocaleString('es-MX')}</p>}
          </header>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="inline-flex items-center justify-center rounded-full w-24 h-24 text-2xl font-extrabold text-white" style={{ backgroundColor: resultColor }}>
              {resultScore}
            </div>
            <p className="text-xs text-slate-400 mt-2">de un máximo de {resultMax} puntos</p>
            <p className="mt-3 text-lg font-bold text-slate-800">{resultInterpretation}</p>
            {resultRec && <p className="mt-2 text-sm text-slate-600">{resultRec}</p>}
            <p className="mt-4 text-xs text-slate-400">{DISCLAIMER}</p>
          </div>

          {persisted === null && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              La evaluación se guardó, pero no pudimos verificar de nuevo el detalle. Puedes revisarla en tu historial.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => navigate('/mh/intervenciones')}
              className="rounded-xl border border-teal-200 bg-teal-50 text-teal-700 px-4 py-3 text-sm font-semibold hover:bg-teal-100"
            >
              Hacer una intervención
            </button>
            <Link to="/mh/insights"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver recomendaciones
            </Link>
            <button
              onClick={() => setChatOpen((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-center font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" /> Hablar con la IA
            </button>
            <button
              onClick={() => navigate('/mh/assessments')}
              className="rounded-xl bg-slate-800 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-900 inline-flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Guardar y salir
            </button>
          </div>

          {chatOpen && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3" data-testid="wb-chat">
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {turns.length === 0 && (
                  <p className="text-xs text-slate-400">Escríbele a la IA sobre cómo te sientes. Respuesta real del servicio de IA.</p>
                )}
                {turns.map((t, i) => (
                  <div key={i} className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${t.role === 'user' ? 'bg-teal-600 text-white ml-auto' : 'bg-slate-100 text-slate-700'}`}>
                    {t.text}
                  </div>
                ))}
                {chatBusy && <p className="text-xs text-slate-400 italic">…escribiendo</p>}
                <div ref={chatEndRef} />
              </div>
              {chatError && <p className="text-xs text-rose-600">{chatError}</p>}
              <form
                className="flex gap-2"
                onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              >
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Escribe un mensaje…"
                  disabled={chatBusy}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Mensaje para la IA"
                />
                <button type="submit" disabled={chatBusy || !chatText.trim()} aria-label="Enviar mensaje"
                  className="rounded-lg bg-teal-600 text-white px-3 py-2 hover:bg-teal-700 disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          <button onClick={restart} className="text-sm text-slate-500 hover:text-teal-600 inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Realizar otra evaluación
          </button>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between">
            <button
              onClick={() => (phase === 'preview' ? setPrevStepAfterReview() : navigate('/mh/assessments'))}
              disabled={busy}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600"
            >
              <ChevronLeft className="w-4 h-4" /> {phase === 'preview' ? 'Revisar respuestas' : 'Volver'}
            </button>
            <span className="text-sm font-semibold text-slate-700">{scale?.name}</span>
          </header>

          {phase === 'saving' && (
            <div className="fixed inset-0 z-30 bg-white/70 backdrop-blur-sm flex items-center justify-center" aria-live="polite">
              <div className="text-center">
                <span className="inline-block animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
                <p className="mt-3 text-sm text-slate-600">Guardando tu evaluación…</p>
              </div>
            </div>
          )}

          {phase === 'preview' || phase === 'saving' ? (
            <div className="space-y-4" data-testid="wb-preview">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Resultado provisional</p>
                {preview ? (
                  <>
                    <p className="mt-2 text-5xl font-extrabold text-slate-800">
                      {preview.score}<span className="text-lg text-slate-400 font-normal">/{preview.max_score}</span>
                    </p>
                    <p className="mt-2 font-bold text-slate-700" style={{ color: preview.color }}>{preview.interpretation}</p>
                    {preview.recommendation && <p className="mt-3 text-sm text-slate-600">{preview.recommendation}</p>}
                  </>
                ) : null}
                <p className="mt-4 text-xs text-slate-400">{DISCLAIMER}</p>
              </div>
              {actionError && <p className="text-sm text-rose-600 rounded-xl bg-rose-50 border border-rose-200 p-3" role="alert">{actionError}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={setPrevStepAfterReview} disabled={busy}
                  className="rounded-xl border border-slate-300 text-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                  Revisar respuestas
                </button>
                <button onClick={handleComplete} disabled={busy} data-testid="wb-confirm"
                  className="rounded-xl bg-teal-600 text-white px-4 py-3 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {busy ? 'Guardando…' : 'Confirmar y guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4" data-testid="wb-answering">
              {/* Progreso */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{answeredCount} de {total} respondidas</span>
                  <span aria-label={`Progreso ${progress}%`}>{progress}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-1.5 rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {q && (
                <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid={`wb-q-${q.id}`}>
                  <p className="text-xs text-slate-400">Pregunta {q.item_number} de {total}</p>
                  <h2 className="mt-1 font-semibold text-slate-800">{q.text}</h2>
                  {q.hint && <p className="mt-1 text-xs text-slate-400">{q.hint}</p>}
                  <div className="mt-4 space-y-2">
                    {q.options.map((o) => {
                      const selected = answers[q.id] === o.value;
                      return (
                        <button
                          key={o.value}
                          onClick={() => handleSelect(q.id, o.value)}
                          aria-pressed={selected}
                          disabled={busy}
                          className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                            selected ? 'border-teal-600 bg-teal-50 text-teal-800 font-semibold' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {actionError && <p className="text-sm text-rose-600" role="alert">{actionError}</p>}

              <div className="flex items-center justify-between gap-2">
                <button onClick={goPrev} disabled={step === 0 || busy}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                  Anterior
                </button>
                {finalAnswered ? (
                  <button onClick={handlePreview} disabled={!complete || busy} data-testid="wb-preview-btn"
                    className="rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> {busy ? 'Calculando…' : 'Ver resultado provisional'}
                  </button>
                ) : (
                  <button onClick={goNext} disabled={answers[q?.id] === undefined || busy}
                    className="rounded-xl bg-slate-800 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-900 disabled:opacity-40 inline-flex items-center gap-1">
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}