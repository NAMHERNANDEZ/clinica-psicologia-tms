import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { treatments, patients, therapists, type Treatment, type Patient, type Therapist } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Progress } from '../../components/ui/Misc';

export default function TreatmentsPage() {
  const [list, setList] = useState<Treatment[]>([]);
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [therapistList, setTherapistList] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: 0, therapist_id: 0, name: '', protocol: '', total_sessions: 10, start_date: '', status: 'active' as 'active' | 'completed' | 'paused' | 'cancelled' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [tRes, pRes, thRes] = await Promise.allSettled([treatments.list(), patients.list(), therapists.list()]);
      if (tRes.status === 'fulfilled') setList(tRes.value.data || []);
      if (pRes.status === 'fulfilled') setPatientList(pRes.value.data || []);
      if (thRes.status === 'fulfilled') setTherapistList(thRes.value.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await treatments.create(form);
      setShowForm(false);
      load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) { case 'active': return 'success'; case 'completed': return 'info'; case 'paused': return 'warning'; case 'cancelled': return 'danger'; default: return 'neutral'; }
  };

  const patientName = (id: number) => patientList.find(p => p.id === id)?.name || `#${id}`;
  const therapistName = (id: number) => therapistList.find(t => t.id === id)?.name || `#${id}`;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tratamientos</h1>
          <p className="text-sm text-slate-500">{list.length} tratamientos registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
          <Plus className="w-4 h-4" /><span>Nuevo Tratamiento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{patientName(t.patient_id)}</p>
                </div>
                <Badge variant={statusVariant(t.status)}>
                  {t.status === 'active' ? 'Activo' : t.status === 'completed' ? 'Completado' : t.status === 'paused' ? 'Pausado' : 'Cancelado'}
                </Badge>
              </div>
              <div className="flex items-center text-xs text-slate-500 mb-3">
                <Users className="w-3.5 h-3.5 mr-1" />
                <span>{therapistName(t.therapist_id)}</span>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{t.completed_sessions}/{t.total_sessions} sesiones</span>
                  <span>{Math.round((t.completed_sessions / t.total_sessions) * 100)}%</span>
                </div>
                <Progress value={t.completed_sessions} max={t.total_sessions} />
              </div>
              {t.protocol && <p className="text-xs text-slate-400">Protocolo: {t.protocol}</p>}
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo Tratamiento" size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Crear'}</button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paciente *</label>
              <select value={form.patient_id || ''} onChange={e => setForm({ ...form, patient_id: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                <option value="">Seleccionar...</option>
                {patientList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Terapeuta *</label>
              <select value={form.therapist_id || ''} onChange={e => setForm({ ...form, therapist_id: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                <option value="">Seleccionar...</option>
                {therapistList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sesiones Totales</label>
              <input type="number" value={form.total_sessions} onChange={e => setForm({ ...form, total_sessions: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Protocolo</label>
            <input value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Nombre del protocolo..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
