import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, BarChart3, Users, Clock, Bot, User, Loader2, AlertTriangle } from 'lucide-react';
import { sendChatMessage, getChatStats, getChatSessions, getChatSessionMessages } from '../../lib/api/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  confidence?: number;
  action?: string;
  created_at?: string;
}

interface ChatSession {
  session_id: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  status: string;
}

interface ChatStats {
  total_sessions: number;
  total_messages: number;
  appointments_requested: number;
  emergency_transfers: number;
  leads_captured: number;
  avg_confidence: number;
}

function StatsPanel() {
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChatStats().then(res => { setStats(res.data?.stats || res.stats); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando estadisticas...</div>;
  if (!stats) return <div className="text-slate-500">Sin datos disponibles</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[
        { label: 'Sesiones totales', value: stats.total_sessions, icon: MessageCircle, color: 'text-blue-400' },
        { label: 'Mensajes totales', value: stats.total_messages, icon: Bot, color: 'text-violet-400' },
        { label: 'Citas solicitadas', value: stats.appointments_requested, icon: Clock, color: 'text-emerald-400' },
        { label: 'Derivaciones emergencia', value: stats.emergency_transfers, icon: AlertTriangle, color: 'text-red-400' },
        { label: 'Leads capturados', value: stats.leads_captured, icon: Users, color: 'text-amber-400' },
        { label: 'Confianza promedio', value: `${Math.round((stats.avg_confidence || 0) * 100)}%`, icon: BarChart3, color: 'text-cyan-400' },
      ].map((item) => (
        <div key={item.label} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
          <span className="text-xl font-bold text-white">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChatSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(text, sessionId);
      const data = res.data || res;
      setSessionId(data.sessionId);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        intent: data.intent,
        confidence: data.confidence,
        action: data.action,
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (e.message || 'No se pudo procesar') }]);
    } finally { setLoading(false); }
  }, [input, loading, sessionId]);

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800/50">
        <Bot className="w-5 h-5 text-violet-400" />
        <span className="font-medium text-white text-sm">Chat IA Clinica</span>
        {sessionId && <span className="text-xs text-slate-500 ml-auto">{sessionId}</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-10">
            Simula una conversacion con el asistente IA. <br />
            Escribe un mensaje para comenzar.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.intent && (
                <div className="mt-1 flex gap-2 text-xs opacity-70">
                  <span>intent: {msg.intent}</span>
                  <span>confidence: {Math.round((msg.confidence || 0) * 100)}%</span>
                  <span>action: {msg.action}</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 mt-1">
              {msg.role === 'user' ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5 text-violet-400" />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <Bot className="w-5 h-5 text-violet-400 mt-1" />
            <div className="bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-400 border border-slate-700">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Procesando...
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      <div className="p-3 border-t border-slate-700 bg-slate-800/30">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsPanel() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    getChatSessions().then(res => { setSessions(res.data?.sessions || res.sessions || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const loadMessages = async (sessionId: string) => {
    setSelectedSession(sessionId);
    try {
      const res = await getChatSessionMessages(sessionId);
      setSessionMessages(res.data?.messages || res.messages || []);
    } catch { setSessionMessages([]); }
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando sesiones...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sessions.length === 0 && <div className="text-slate-500 text-sm">No hay sesiones aun</div>}
        {sessions.map(s => (
          <button
            key={s.session_id}
            onClick={() => loadMessages(s.session_id)}
            className={`w-full text-left p-3 rounded-lg border text-sm ${
              selectedSession === s.session_id
                ? 'bg-violet-600/20 border-violet-500'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex justify-between">
              <span className="text-white font-mono text-xs">{s.session_id}</span>
              <span className={`text-xs ${s.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>{s.status}</span>
            </div>
            <div className="text-slate-400 text-xs mt-1">{s.message_count} mensajes | {new Date(s.last_message_at).toLocaleString('es-MX')}</div>
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 max-h-[400px] overflow-y-auto">
        {!selectedSession && <div className="text-slate-500 text-sm text-center py-10">Selecciona una sesion para ver mensajes</div>}
        {sessionMessages.map((msg, i) => (
          <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-violet-600/20 text-violet-200'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.intent && <div className="text-xs opacity-60 mt-1">intent: {msg.intent} | {Math.round((msg.confidence || 0) * 100)}%</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Tab = 'simulator' | 'sessions' | 'stats';

export default function ChatPage() {
  const [tab, setTab] = useState<Tab>('simulator');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'simulator', label: 'Simulador Chat', icon: MessageCircle },
    { key: 'sessions', label: 'Sesiones', icon: Clock },
    { key: 'stats', label: 'Estadisticas', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-8 h-8 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Chat IA Clinico</h1>
          <p className="text-slate-400 text-sm">Asistente virtual con RAG clinico y Gemini AI</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'simulator' && <ChatSimulator />}
      {tab === 'sessions' && <SessionsPanel />}
      {tab === 'stats' && <StatsPanel />}
    </div>
  );
}
