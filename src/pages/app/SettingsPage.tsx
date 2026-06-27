import { useState, useEffect } from 'react';
import { Settings, Users, FileText, Brain } from 'lucide-react';
import { templates, tmsProtocols, therapists, alerts, type Template, type TmsProtocol, type Therapist } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'templates' | 'protocols' | 'alerts'>('users');
  const [therapistList, setTherapistList] = useState<Therapist[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [protocolList, setProtocolList] = useState<TmsProtocol[]>([]);
  const [alertSummary, setAlertSummary] = useState({ total: 0, unread: 0, critical: 0, warnings: 0 });
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', content: '', type: 'whatsapp' as 'whatsapp' | 'email' });
  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [protocolForm, setProtocolForm] = useState({ name: '', indication: '', target_area: 'dlpfc', frequency_hz: 10, intensity_pct_mt: 100, pulses_per_session: 3000, session_duration_min: 20, total_sessions: 30, stimulation_type: 'rTMS', evidence_level: 'Level A' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [thRes, tRes, prRes, aRes] = await Promise.allSettled([
        therapists.list(), templates.list(), tmsProtocols.list(), alerts.getSummary(),
      ]);
      if (thRes.status === 'fulfilled') setTherapistList(thRes.value.data || []);
      if (tRes.status === 'fulfilled') setTemplateList(tRes.value.data || []);
      if (prRes.status === 'fulfilled') setProtocolList(prRes.value.data || []);
      if (aRes.status === 'fulfilled') setAlertSummary(aRes.value.data as typeof alertSummary);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const saveTemplate = async () => {
    try {
      await templates.create(templateForm);
      setShowTemplateForm(false);
      setTemplateForm({ name: '', content: '', type: 'whatsapp' });
      load();
    } catch { /* silent */ }
  };

  const saveProtocol = async () => {
    try {
      await tmsProtocols.create(protocolForm);
      setShowProtocolForm(false);
      load();
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const tabs = [
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'templates', label: 'Plantillas', icon: FileText },
    { key: 'protocols', label: 'Protocolos TMS', icon: Brain },
    { key: 'alerts', label: 'Alertas', icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500">Gestiona usuarios, plantillas y protocolos del sistema</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Terapeutas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {therapistList.map(t => (
              <Card key={t.id}>
                <CardBody>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.specialty}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{t.email}</span>
                    <Badge variant={t.active ? 'success' : 'neutral'}>{t.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Plantillas de Mensajes</h2>
            <button onClick={() => setShowTemplateForm(true)} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">+ Nueva Plantilla</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templateList.map(t => (
              <Card key={t.id}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.content}</p>
                    </div>
                    <Badge variant={t.type === 'whatsapp' ? 'success' : 'info'}>{t.type}</Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'protocols' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Protocolos TMS</h2>
            <button onClick={() => setShowProtocolForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">+ Nuevo Protocolo</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {protocolList.map(p => (
              <Card key={p.id}>
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{p.indication}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                    <span>Área: {p.target_area}</span>
                    <span>Frecuencia: {p.frequency_hz} Hz</span>
                    <span>Intensidad: {p.intensity_pct_mt}% MT</span>
                    <span>Sesiones: {p.total_sessions}</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardBody>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{alertSummary.total}</p>
          </CardBody></Card>
          <Card><CardBody>
            <p className="text-xs text-slate-500">No leídas</p>
            <p className="text-2xl font-bold text-blue-600">{alertSummary.unread}</p>
          </CardBody></Card>
          <Card><CardBody>
            <p className="text-xs text-slate-500">Críticas</p>
            <p className="text-2xl font-bold text-red-600">{alertSummary.critical}</p>
          </CardBody></Card>
          <Card><CardBody>
            <p className="text-xs text-slate-500">Advertencias</p>
            <p className="text-2xl font-bold text-amber-600">{alertSummary.warnings}</p>
          </CardBody></Card>
        </div>
      )}

      <Modal isOpen={showTemplateForm} onClose={() => setShowTemplateForm(false)} title="Nueva Plantilla" size="md"
        footer={<>
          <button onClick={() => setShowTemplateForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
          <button onClick={saveTemplate} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">Guardar</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select value={templateForm.type} onChange={e => setTemplateForm({ ...templateForm, type: e.target.value as 'whatsapp' | 'email' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contenido</label>
            <textarea value={templateForm.content} onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Usa {nombre}, {fecha}, {hora} como variables..." />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showProtocolForm} onClose={() => setShowProtocolForm(false)} title="Nuevo Protocolo TMS" size="lg"
        footer={<>
          <button onClick={() => setShowProtocolForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
          <button onClick={saveProtocol} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">Crear Protocolo</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input value={protocolForm.name} onChange={e => setProtocolForm({ ...protocolForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Indicación *</label>
              <input value={protocolForm.indication} onChange={e => setProtocolForm({ ...protocolForm, indication: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Área Objetivo</label>
              <select value={protocolForm.target_area} onChange={e => setProtocolForm({ ...protocolForm, target_area: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                <option value="dlpfc">DLPFC</option><option value="m1">M1</option><option value="broca">Broca</option><option value="wernicke">Wernicke</option><option value="acc">ACC</option><option value="insula">Ínsula</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia (Hz)</label>
              <input type="number" value={protocolForm.frequency_hz} onChange={e => setProtocolForm({ ...protocolForm, frequency_hz: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">% MT</label>
              <input type="number" value={protocolForm.intensity_pct_mt} onChange={e => setProtocolForm({ ...protocolForm, intensity_pct_mt: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pulsos/Sesión</label>
              <input type="number" value={protocolForm.pulses_per_session} onChange={e => setProtocolForm({ ...protocolForm, pulses_per_session: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
              <input type="number" value={protocolForm.session_duration_min} onChange={e => setProtocolForm({ ...protocolForm, session_duration_min: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sesiones Totales</label>
              <input type="number" value={protocolForm.total_sessions} onChange={e => setProtocolForm({ ...protocolForm, total_sessions: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
