import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PATIENT_CHAT_API =
  import.meta.env.VITE_PATIENT_CHAT_URL ||
  'https://patient-ai-chat.terapiamagneticatranscraneal.workers.dev';

interface ChatTurn {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  crisis?: boolean;
  error?: boolean;
}

interface PatientChatResponse {
  response: string;
  intent: string;
  safety_pass: boolean;
  next_action: string;
  topic?: string;
  crisis?: boolean;
  error?: string;
}

const QUICK_QUESTIONS = [
  '¿Qué es la TMS?',
  '¿Cómo funciona?',
  '¿Soy candidato?',
  'Tengo ansiedad',
];

export default function PatientAIChat() {
  const { language } = useLanguage();
  const isEs = language === 'es';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(
    `paichat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput('');
    setLoading(true);
    setMessages((m) => [...m, { id: Date.now(), role: 'user', text: value }]);
    try {
      const res = await fetch(`${PATIENT_CHAT_API}/api/patient-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, session_id: sessionId.current }),
      });
      const data: PatientChatResponse = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: 'assistant',
          text: data.response,
          crisis: data.next_action === 'emergency',
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: 'assistant',
          text: isEs
            ? 'No pude conectar ahora. Intenta de nuevo en un momento.'
            : 'I could not connect right now. Please try again in a moment.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-6 z-50 flex items-center space-x-2 bg-navy-900 hover:bg-navy-800 text-white px-5 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:shadow-navy-900/25 transition-all duration-300"
        aria-label={isEs ? 'Pregúntale a nuestra IA' : 'Ask our AI'}
      >
        <Bot className="w-6 h-6 text-teal-400" />
        <span className="font-semibold hidden sm:inline">
          {isEs ? 'Pregúntale a nuestra IA' : 'Ask our AI'}
        </span>
      </button>

      {/* Panel del chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="bg-navy-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <div>
                <p className="text-white text-sm font-semibold leading-tight">
                  {isEs ? 'Asistente TMS' : 'TMS Assistant'}
                </p>
                <p className="text-slate-400 text-xs">
                  {isEs ? 'Información clínica educativa' : 'Clinical information'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:text-white transition-colors"
              aria-label={isEs ? 'Cerrar' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot className="w-10 h-10 text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-navy-900 font-medium">
                  {isEs ? '¿Qué quieres saber?' : 'What would you like to know?'}
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-teal-500 text-white'
                      : m.crisis
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : m.error
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-white text-navy-900 border border-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Sugerencias */}
          <div className="px-3 pt-2 flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium rounded-full border border-teal-200 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 flex items-center space-x-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={500}
              placeholder={isEs ? 'Escribe tu pregunta...' : 'Type your question...'}
              disabled={loading}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm"
              aria-label={isEs ? 'Mensaje' : 'Message'}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-300 text-white rounded-xl transition-colors"
              aria-label={isEs ? 'Enviar' : 'Send'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-2 bg-slate-100 text-[11px] text-slate-500">
            <MessageSquare className="w-3 h-3 inline mr-1" />
            {isEs
              ? 'Asistente informativo. No sustituye una evaluación clínica ni emite diagnóstico.'
              : 'Informational assistant. Does not replace a clinical evaluation or issue a diagnosis.'}
          </div>
        </div>
      )}
    </>
  );
}
