import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import { tmsProfiles, tmsSessions, tmsProtocols, clinicalResponse, adverseEffects, motorThresholds, patients, therapists, type TmsProfile, type TmsSession, type TmsProtocol, type ClinicalResponse, type AdverseEffect, type MotorThreshold, type Patient, type Therapist } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-medium text-slate-600">{label}</label>{children}</div>;
}

export default function TmsModulePage() {
  const [profiles, setProfiles] = useState<TmsProfile[]>([]);
  const [protocols, setProtocols] = useState<TmsProtocol[]>([]);
  const [sessions, setSessions] = useState<TmsSession[]>([]);
  const [responses, setResponses] = useState<ClinicalResponse[]>([]);
  const [effects, setEffects] = useState<AdverseEffect[]>([]);
  const [mts, setMts] = useState<MotorThreshold[]>([]);
  const [patList, setPatList] = useState<Patient[]>([]);
  const [therList, setTherList] = useState<Therapist[]>([]);
  const [activeTab, setActiveTab] = useState<'mt' | 'profiles' | 'protocols' | 'sessions' | 'response' | 'effects'>('mt');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [prRes, protRes, crRes, aeRes, mtRes, patRes, therRes] = await Promise.allSettled([
        tmsProfiles.list(), tmsProtocols.list(), clinicalResponse.listByPatient(0),
        adverseEffects.listByPatient(0), motorThresholds.list(),
        patients.list(), therapists.list(),
      ]);
      if (prRes.status === 'fulfilled') setProfiles(prRes.value.data || []);
      if (protRes.status === 'fulfilled') setProtocols(protRes.value.data || []);
      if (crRes.status === 'fulfilled') setResponses(crRes.value.data || []);
      if (aeRes.status === 'fulfilled') setEffects(aeRes.value.data || []);
      if (mtRes.status === 'fulfilled') setMts(mtRes.value.data || []);
      if (patRes.status === 'fulfilled') setPatList(patRes.value.data || []);
      if (therRes.status === 'fulfilled') setTherList(therRes.value.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) { case 'active': case 'completed': return 'success'; case 'evaluation': return 'info'; case 'discontinued': case 'cancelled': case 'no_show': return 'danger'; case 'in_progress': return 'warning'; default: return 'neutral'; }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const tabs = [
    { key: 'mt', label: 'Umbral Motor' },
    { key: 'profiles', label: 'Perfiles TMS' },
    { key: 'protocols', label: 'Protocolos' },
    { key: 'sessions', label: 'Sesiones' },
    { key: 'response', label: 'Respuesta Clínica' },
    { key: 'effects', label: 'Efectos Adversos' },
  ] as const;

  const handleSaveMt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await motorThresholds.create({
        patient_id: Number(fd.get('patient_id')),
        mt_pct: Number(fd.get('mt_pct')),
        measured_at: new Date().toISOString(),
        coil_type: fd.get('coil_type') as string || undefined,
        method: fd.get('method') as string || undefined,
        notes: fd.get('notes') as string || undefined,
      });
      setShowModal(null);
      load();
    } catch { alert('Error al guardar'); } finally { setSaving(false); }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await tmsProfiles.create({
        patient_id: Number(fd.get('patient_id')),
        protocol_id: Number(fd.get('protocol_id')),
        therapist_id: Number(fd.get('therapist_id')),
        motor_threshold_id: Number(fd.get('motor_threshold_id')),
        assigned_diagnosis: fd.get('diagnosis') as string,
      });
      setShowModal(null);
      load();
    } catch { alert('Error al guardar'); } finally { setSaving(false); }
  };

  const handleSaveSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      const prof = profiles.find(p => p.id === Number(fd.get('profile_id')));
      await tmsSessions.create({
        profile_id: Number(fd.get('profile_id')),
        session_number: Number(fd.get('session_number')),
        motor_threshold_pct: Number(fd.get('mt_pct')),
        intensity_pct_mt: Number(fd.get('intensity_pct')),
        effective_intensity: Math.round(Number(fd.get('mt_pct')) * Number(fd.get('intensity_pct')) / 100 * 10) / 10,
        target_area: (prof as any)?.target_area || fd.get('target_area') as string || 'DLPFC',
        frequency_hz: Number(fd.get('frequency')),
        pulses_delivered: Number(fd.get('pulses')),
        session_duration_min: Number(fd.get('duration')),
        stimulation_type: fd.get('stim_type') as string || 'rTMS',
        notes: fd.get('notes') as string || undefined,
      });
      setShowModal(null);
      load();
    } catch { alert('Error al guardar'); } finally { setSaving(false); }
  };

  const handleSaveResponse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await clinicalResponse.record({
        tms_session_id: Number(fd.get('session_id')),
        mood_score: Number(fd.get('mood_score')),
        energy_score: fd.get('energy_score') ? Number(fd.get('energy_score')) : undefined,
        anxiety_score: fd.get('anxiety_score') ? Number(fd.get('anxiety_score')) : undefined,
        sleep_score: fd.get('sleep_score') ? Number(fd.get('sleep_score')) : undefined,
        notes: fd.get('notes') as string || undefined,
      });
      setShowModal(null);
      load();
    } catch { alert('Error al guardar'); } finally { setSaving(false); }
  };

  const handleSaveEffect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await adverseEffects.record({
        tms_session_id: Number(fd.get('session_id')),
        patient_id: Number(fd.get('patient_id')),
        effect_type: fd.get('effect_type') as string,
        severity: fd.get('severity') as string || 'mild',
        description: fd.get('description') as string || undefined,
      });
      setShowModal(null);
      load();
    } catch { alert('Error al guardar'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Módulo TMS</h1>
            <p className="text-sm text-slate-500">Gestión de mediciones, protocolos, sesiones y seguimiento clínico</p>
          </div>
        </div>
        {activeTab === 'mt' && (
          <button onClick={() => setShowModal('mt')} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors">
            <Plus className="w-4 h-4" /> Nueva Medición
          </button>
        )}
        {activeTab === 'profiles' && (
          <button onClick={() => setShowModal('profile')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Perfil
          </button>
        )}
        {activeTab === 'sessions' && (
          <button onClick={() => setShowModal('session')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Nueva Sesión
          </button>
        )}
        {activeTab === 'response' && (
          <button onClick={() => setShowModal('response')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" /> Registrar Respuesta
          </button>
        )}
        {activeTab === 'effects' && (
          <button onClick={() => setShowModal('effect')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> Registrar Efecto
          </button>
        )}
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== UMBRAL MOTOR ===== */}
      {activeTab === 'mt' && (
        <div className="space-y-3">
          {mts.map(m => (
            <Card key={m.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.patient_name || `Paciente #${m.patient_id}`}</p>
                    <p className="text-xs text-slate-500">{m.stimulation_site} · {m.method} {m.coil_type ? `· Bobina: ${m.coil_type}` : ''}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(m.measured_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-600">{m.mt_pct}%</p>
                    <p className="text-[10px] text-slate-400">Umbral Motor</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          {mts.length === 0 && <div className="text-center py-12 text-slate-400">Sin mediciones de umbral motor</div>}
        </div>
      )}

      {/* ===== PERFILES ===== */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-slate-900">{p.protocol_name || `Protocolo #${p.protocol_id}`}</p>
                  <Badge variant={statusVariant(p.status)}>
                    {p.status === 'active' ? 'Activo' : p.status === 'evaluation' ? 'Evaluación' : p.status === 'completed' ? 'Completado' : 'Interrumpido'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mb-1">{p.patient_name || `Paciente #${p.patient_id}`}</p>
                <p className="text-xs text-slate-400">{p.assigned_diagnosis}</p>
                {(p.baseline_bdi || p.baseline_gad7 || p.baseline_phq9) && (
                  <div className="flex space-x-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    {p.baseline_bdi && <span>BDI: {p.baseline_bdi}</span>}
                    {p.baseline_gad7 && <span>GAD-7: {p.baseline_gad7}</span>}
                    {p.baseline_phq9 && <span>PHQ-9: {p.baseline_phq9}</span>}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
          {profiles.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Sin perfiles TMS registrados</p>
            </div>
          )}
        </div>
      )}

      {/* ===== PROTOCOLOS ===== */}
      {activeTab === 'protocols' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {protocols.map(p => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-2">{p.indication}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>Frecuencia: {p.frequency_hz} Hz</span>
                  <span>Intensidad: {p.intensity_pct_mt}% MT</span>
                  <span>Pulsos: {p.pulses_per_session}/sesión</span>
                  <span>Duración: {p.session_duration_min} min</span>
                  <span>Sesiones totales: {p.total_sessions}</span>
                  <span>Evidencia: {p.evidence_level}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ===== SESIONES ===== */}
      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {sessions.slice(0, 20).map(s => (
            <Card key={s.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                      #{s.session_number}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.target_area} — {s.stimulation_type}</p>
                      <p className="text-xs text-slate-500">{s.frequency_hz} Hz · {s.pulses_delivered} pulsos · {s.session_duration_min} min · {s.effective_intensity}% intensidad</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(s.status)}>
                    {s.status === 'completed' ? 'Completada' : s.status === 'in_progress' ? 'En curso' : s.status === 'scheduled' ? 'Programada' : s.status === 'cancelled' ? 'Cancelada' : 'No asistió'}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
          {sessions.length === 0 && <div className="text-center py-12 text-slate-400">Sin sesiones registradas</div>}
        </div>
      )}

      {/* ===== RESPUESTA CLÍNICA ===== */}
      {activeTab === 'response' && (
        <div className="space-y-3">
          {responses.map(r => (
            <Card key={r.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Sesión #{r.tms_session_id} — Paciente #{r.patient_id}</p>
                    <p className="text-xs text-slate-500">{r.notes || 'Sin notas'}</p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-blue-600">Ánimo: {r.mood_score}/10</span>
                    {r.anxiety_score != null && <span className="text-amber-600">Ansiedad: {r.anxiety_score}/10</span>}
                    {r.energy_score != null && <span className="text-emerald-600">Energía: {r.energy_score}/10</span>}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          {responses.length === 0 && <div className="text-center py-12 text-slate-400">Sin registros de respuesta</div>}
        </div>
      )}

      {/* ===== EFECTOS ADVERSOS ===== */}
      {activeTab === 'effects' && (
        <div className="space-y-3">
          {effects.map(e => (
            <Card key={e.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {e.severity === 'severe' ? <XCircle className="w-5 h-5 text-red-500" /> : e.severity === 'moderate' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{e.effect_type}</p>
                      <p className="text-xs text-slate-500">{e.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <Badge variant={e.severity === 'severe' ? 'danger' : e.severity === 'moderate' ? 'warning' : 'success'}>
                    {e.severity === 'severe' ? 'Severo' : e.severity === 'moderate' ? 'Moderado' : 'Leve'}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
          {effects.length === 0 && <div className="text-center py-12 text-slate-400">Sin efectos adversos registrados</div>}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Modal: Nueva Medición MT */}
      <Modal open={showModal === 'mt'} onClose={() => setShowModal(null)} title="Nueva Medición de Umbral Motor">
        <form onSubmit={handleSaveMt} className="space-y-4">
          <Field label="Paciente">
            <select name="patient_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {patList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Umbral Motor (%)">
            <input name="mt_pct" type="number" step="0.1" min="0" max="100" required placeholder="ej. 45" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bobina">
              <select name="coil_type" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                <option value="figure-8">Figura-8</option>
                <option value="circular">Circular</option>
                <option value="H-coil">H-Coil</option>
              </select>
            </Field>
            <Field label="Método">
              <select name="method" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                <option value=" Rossini">Rossini</option>
                <option value="120% MEP">120% MEP</option>
                <option value="50% method">50% method</option>
              </select>
            </Field>
          </div>
          <Field label="Notas">
            <textarea name="notes" rows={2} placeholder="Observaciones..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Guardar Medición'}
          </button>
        </form>
      </Modal>

      {/* Modal: Nuevo Perfil */}
      <Modal open={showModal === 'profile'} onClose={() => setShowModal(null)} title="Nuevo Perfil TMS">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Field label="Paciente">
            <select name="patient_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {patList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Protocolo">
            <select name="protocol_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {protocols.map(p => <option key={p.id} value={p.id}>{p.name} — {p.target_area}</option>)}
            </select>
          </Field>
          <Field label="Terapeuta">
            <select name="therapist_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {therList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Medición de Umbral Motor">
            <select name="motor_threshold_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {mts.map(m => <option key={m.id} value={m.id}>{m.patient_name} — MT: {m.mt_pct}% — {new Date(m.measured_at).toLocaleDateString('es-MX')}</option>)}
            </select>
          </Field>
          <Field label="Diagnóstico">
            <input name="diagnosis" required placeholder="ej. Trastorno Depresivo Mayor" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Crear Perfil'}
          </button>
        </form>
      </Modal>

      {/* Modal: Nueva Sesión */}
      <Modal open={showModal === 'session'} onClose={() => setShowModal(null)} title="Nueva Sesión TMS">
        <form onSubmit={handleSaveSession} className="space-y-4">
          <Field label="Perfil TMS">
            <select name="profile_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.patient_name} — {p.protocol_name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nº Sesión">
              <input name="session_number" type="number" min="1" required placeholder="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="MT (%)">
              <input name="mt_pct" type="number" step="0.1" required placeholder="45" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Intensidad %MT">
              <input name="intensity_pct" type="number" step="1" required placeholder="120" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Frecuencia (Hz)">
              <input name="frequency" type="number" required placeholder="10" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Pulsos">
              <input name="pulses" type="number" required placeholder="3000" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Duración (min)">
              <input name="duration" type="number" required placeholder="20" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
          </div>
          <Field label="Tipo de Estimulación">
            <select name="stim_type" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="rTMS">rTMS</option>
              <option value="iTBS">iTBS</option>
              <option value="dTMS">dTMS</option>
            </select>
          </Field>
          <Field label="Zona Objetivo">
            <select name="target_area" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="DLPFC">DLPFC</option>
              <option value="M1">M1</option>
              <option value="Broca">Broca</option>
              <option value="Wernicke">Wernicke</option>
              <option value="ACC">ACC</option>
              <option value="Insula">Insula</option>
              <option value="SMA">SMA</option>
            </select>
          </Field>
          <Field label="Notas">
            <textarea name="notes" rows={2} placeholder="Observaciones de la sesión..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Registrar Sesión'}
          </button>
        </form>
      </Modal>

      {/* Modal: Respuesta Clínica */}
      <Modal open={showModal === 'response'} onClose={() => setShowModal(null)} title="Registrar Respuesta Clínica">
        <form onSubmit={handleSaveResponse} className="space-y-4">
          <Field label="Sesión TMS">
            <select name="session_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {sessions.filter(s => s.status === 'completed').map(s => <option key={s.id} value={s.id}>S{s.session_number} — Perfil #{s.profile_id}</option>)}
            </select>
          </Field>
          <Field label="Ánimo (0-10)">
            <input name="mood_score" type="number" min="0" max="10" required placeholder="0-10" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ansiedad (0-10)">
              <input name="anxiety_score" type="number" min="0" max="10" placeholder="0-10" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Energía (0-10)">
              <input name="energy_score" type="number" min="0" max="10" placeholder="0-10" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Sueño (0-10)">
              <input name="sleep_score" type="number" min="0" max="10" placeholder="0-10" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </Field>
          </div>
          <Field label="Notas">
            <textarea name="notes" rows={2} placeholder="Observaciones del paciente..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Registrar Respuesta'}
          </button>
        </form>
      </Modal>

      {/* Modal: Efecto Adverso */}
      <Modal open={showModal === 'effect'} onClose={() => setShowModal(null)} title="Registrar Efecto Adverso">
        <form onSubmit={handleSaveEffect} className="space-y-4">
          <Field label="Sesión TMS">
            <select name="session_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {sessions.map(s => <option key={s.id} value={s.id}>S{s.session_number} — Perfil #{s.profile_id}</option>)}
            </select>
          </Field>
          <Field label="Paciente">
            <select name="patient_id" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">Seleccionar...</option>
              {patList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo de Efecto">
            <select name="effect_type" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="dolor_cabeza">Dolor de cabeza</option>
              <option value="molestia_scalp">Molestia en cuero cabelludo</option>
              <option value="mareo">Mareo</option>
              <option value="insomnio">Insomnio</option>
              <option value="ansiedad">Ansiedad temporal</option>
              <option value="fatiga">Fatiga</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          <Field label="Severidad">
            <select name="severity" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="mild">Leve</option>
              <option value="moderate">Moderado</option>
              <option value="severe">Severo</option>
            </select>
          </Field>
          <Field label="Descripción">
            <textarea name="description" rows={2} placeholder="Describe el efecto..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </Field>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Registrar Efecto'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
