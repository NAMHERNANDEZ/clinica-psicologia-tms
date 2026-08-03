import { useState, useEffect, useCallback } from 'react';
import { Megaphone, FileText, Send, Search, BarChart3, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { marketing, type ContentGenerationResult, type CampaignGenerationResult, type SeoGenerationResult } from '../../lib/api';

type Tab = 'content' | 'campaign' | 'seo' | 'overview';

const VALIDATION_STYLE: Record<string, string> = {
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  requires_review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  blocked: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function ValidationBadge({ status, score }: { status: string; score: number }) {
  const Icon = status === 'approved' ? CheckCircle2 : status === 'blocked' ? XCircle : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${VALIDATION_STYLE[status] || VALIDATION_STYLE.requires_review}`}>
      <Icon className="w-3 h-3" />
      {score}/100
    </span>
  );
}

function ContentPanel() {
  const [form, setForm] = useState({ topic: '', type: 'social', audience: '', goal: '', length: 'medio' });
  const [result, setResult] = useState<ContentGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    if (!form.topic.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await marketing.generateContent({ topic: form.topic, type: form.type, audience: form.audience, goal: form.goal, length: form.length });
      setResult(res.data);
    } catch (e: any) { setError(e.message || 'Error'); }
    finally { setLoading(false); }
  }, [form]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Tema (ej: TMS para ansiedad)" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
        <select className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="social">Instagram</option>
          <option value="blog">Blog SEO</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <input placeholder="Audiencia (ej: adultos 25-45)" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} />
        <select className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.length} onChange={e => setForm(f => ({ ...f, length: e.target.value }))}>
          <option value="corto">Corto</option>
          <option value="medio">Medio</option>
          <option value="extenso">Extenso</option>
        </select>
      </div>
      <button onClick={generate} disabled={loading || !form.topic.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Generar Contenido
      </button>
      {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div>}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">{result.content.headline}</h4>
            <ValidationBadge status={result.validation.status} score={result.validation.score} />
          </div>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{result.content.body}</p>
          <p className="text-blue-400 text-sm font-medium">{result.content.cta}</p>
          <div className="flex gap-2 flex-wrap">
            {result.content.hashtags.map((h, i) => <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{h}</span>)}
          </div>
          <div className="text-xs text-slate-500">Fuente: {result.source} | Modelo: {result.model || 'template'}</div>
        </div>
      )}
    </div>
  );
}

function CampaignPanel() {
  const [form, setForm] = useState({ name: '', audience: '', budget: 1000, channels: ['instagram', 'whatsapp'], durationDays: 15, goal: '' });
  const [result, setResult] = useState<CampaignGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    if (!form.name.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await marketing.generateCampaign(form);
      setResult(res.data);
    } catch (e: any) { setError(e.message || 'Error'); }
    finally { setLoading(false); }
  }, [form]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Nombre campana" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input placeholder="Audiencia" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} />
        <input type="number" placeholder="Presupuesto MXN" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) }))} />
        <input type="number" placeholder="Dias" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
      </div>
      <button onClick={generate} disabled={loading || !form.name.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Generar Campana
      </button>
      {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div>}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">Campana generada</h4>
            <ValidationBadge status={result.validation.status} score={result.validation.score} />
          </div>
          <p className="text-slate-300 text-sm">{result.campaign.summary}</p>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{result.campaign.copy}</p>
          <p className="text-emerald-400 text-sm font-medium">{result.campaign.cta}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-700/50 rounded p-2"><p className="text-xs text-slate-400">Impresiones</p><p className="text-white font-bold">{result.campaign.expected_metrics.impressions.toLocaleString()}</p></div>
            <div className="bg-slate-700/50 rounded p-2"><p className="text-xs text-slate-400">Clicks</p><p className="text-white font-bold">{result.campaign.expected_metrics.clicks.toLocaleString()}</p></div>
            <div className="bg-slate-700/50 rounded p-2"><p className="text-xs text-slate-400">Conversiones</p><p className="text-white font-bold">{result.campaign.expected_metrics.conversions.toLocaleString()}</p></div>
          </div>
          <div className="text-xs text-slate-500">Fuente: {result.source} | Modelo: {result.model || 'template'}</div>
        </div>
      )}
    </div>
  );
}

function SeoPanel() {
  const [form, setForm] = useState({ keyword: '', searchIntent: 'informativo', competition: 'media', audience: '' });
  const [result, setResult] = useState<SeoGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    if (!form.keyword.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await marketing.generateSeo(form);
      setResult(res.data);
    } catch (e: any) { setError(e.message || 'Error'); }
    finally { setLoading(false); }
  }, [form]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Keyword (ej: terapia magnetica)" className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))} />
        <select className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" value={form.searchIntent} onChange={e => setForm(f => ({ ...f, searchIntent: e.target.value }))}>
          <option value="informativo">Informativo</option>
          <option value="comercial">Comercial</option>
          <option value="transaccional">Transaccional</option>
        </select>
      </div>
      <button onClick={generate} disabled={loading || !form.keyword.trim()} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        Analizar SEO
      </button>
      {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div>}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <h4 className="text-white font-medium">{result.seo.meta_title}</h4>
          <p className="text-slate-300 text-sm">{result.seo.meta_description}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-700/50 rounded p-2"><p className="text-xs text-slate-400">Dificultad</p><p className="text-white font-bold">{result.seo.difficulty}/100</p></div>
            <div className="bg-slate-700/50 rounded p-2"><p className="text-xs text-slate-400">Volumen</p><p className="text-white font-bold">{result.seo.volume_estimate}</p></div>
            <div className="bg-slate-700/50 rounded p-2"><p className="text-xs text-slate-400">Schema</p><p className="text-white font-bold">{result.seo.schema_type}</p></div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Estructura de contenido:</p>
            <ul className="text-sm text-slate-300 list-disc list-inside">{result.seo.content_outline.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className="text-xs text-slate-500">Fuente: {result.source} | Modelo: {result.model || 'template'}</div>
        </div>
      )}
    </div>
  );
}

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('content');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; content_type: string; topic: string; validation_score: number; status: string; created_at: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (tab === 'overview') {
      marketing.overview().then(res => setOverview(res.data)).catch(() => {});
    }
    if (tab === 'content') {
      setHistoryLoading(true);
      marketing.listContent().then(res => setHistory(res.data || [])).catch(() => {}).finally(() => setHistoryLoading(false));
    }
  }, [tab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'content', label: 'Contenido IA', icon: <FileText className="w-4 h-4" /> },
    { key: 'campaign', label: 'Campanas IA', icon: <Send className="w-4 h-4" /> },
    { key: 'seo', label: 'SEO IA', icon: <Search className="w-4 h-4" /> },
    { key: 'overview', label: 'KPIs', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Marketing AI</h1>
        <span className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">FASE 11.7</span>
      </div>

      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6">
        {tab === 'content' && <ContentPanel />}
        {tab === 'campaign' && <CampaignPanel />}
        {tab === 'seo' && <SeoPanel />}
        {tab === 'overview' && (
          <div className="space-y-4">
            {overview ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center"><p className="text-xs text-slate-400">Leads Mes</p><p className="text-2xl font-bold text-white">{(overview as any)?.growth?.current_month || 0}</p></div>
                <div className="bg-slate-800 rounded-lg p-3 text-center"><p className="text-xs text-slate-400">Crecimiento</p><p className="text-2xl font-bold text-emerald-400">{(overview as any)?.growth?.growth_percentage || 0}%</p></div>
                <div className="bg-slate-800 rounded-lg p-3 text-center"><p className="text-xs text-slate-400">ROI Estimado</p><p className="text-2xl font-bold text-white">${(overview as any)?.estimated_roi || 0}</p></div>
                <div className="bg-slate-800 rounded-lg p-3 text-center"><p className="text-xs text-slate-400">Total Leads</p><p className="text-2xl font-bold text-white">{(overview as any)?.channels?.total_leads || 0}</p></div>
              </div>
            ) : <p className="text-slate-400 text-sm">Cargando KPIs...</p>}
          </div>
        )}
      </div>

      {tab === 'content' && history.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Historial generado</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                <div><span className="text-slate-300 text-sm">{item.topic}</span><span className="text-xs text-slate-500 ml-2">{item.content_type}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{item.status}</span>
                  <ValidationBadge status={item.validation_score >= 85 ? 'approved' : 'requires_review'} score={item.validation_score} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
