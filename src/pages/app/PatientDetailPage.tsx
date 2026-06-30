import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, Activity, FileText, Clock, Brain, Zap } from 'lucide-react';
import { patients, timeline as timelineApi, clinicalNotes, tmsProfiles, tmsSessions, clinicalResponse, treatments, type Patient, type TimelineEvent, type ClinicalNote, type TmsProfile, type TmsSession, type ClinicalResponse as ClinicalResponseType, type Treatment } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Timeline as TimelineComponent } from '../../components/ui/Misc';
import { LineChart as LineChartViz } from '../../components/ui/Chart';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [profiles, setProfiles] = useState<TmsProfile[]>([]);
  const [sessions, setSessions] = useState<TmsSession[]>([]);
  const [responses, setResponses] = useState<ClinicalResponseType[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<Treatment[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tms' | 'sessions' | 'treatments'>('timeline');
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  const patientId = Number(id);

  useEffect(() => { if (patientId) load(); }, [patientId]);

  const load = async () => {
    try {
      const [pRes, tRes, nRes, prRes, sRes, crRes, trRes] = await Promise.allSettled([
        patients.get(patientId),
        timelineApi.listByPatient(patientId),
        clinicalNotes.listByPatient(patientId),
        tmsProfiles.listByPatient(patientId),
        tmsSessions.listByProfile(0),
        clinicalResponse.listByPatient(patientId),
        treatments.list(),
      ]);
      if (pRes.status === 'fulfilled') setPatient(pRes.value.data);
      if (tRes.status === 'fulfilled') setTimeline(tRes.value.data || []);
      if (nRes.status === 'fulfilled') setNotes(nRes.value.data || []);
      if (prRes.status === 'fulfilled') {
        const p = prRes.value.data || [];
        setProfiles(p);
        if (p.length > 0) {
          const allSessions: TmsSession[] = [];
          for (const profile of p) {
            try {
              const sRes = await tmsSessions.listByProfile(profile.id);
              if (sRes.data) allSessions.push(...sRes.data);
            } catch { /* skip */ }
          }
          setSessions(allSessions.sort((a, b) => a.session_number - b.session_number));
        }
      }
      if (crRes.status === 'fulfilled') setResponses(crRes.value.data || []);
      if (trRes.status === 'fulfilled') {
        const allTreatments = trRes.value.data || [];
        setPatientTreatments(allTreatments.filter((t: Treatment) => t.patient_id === patientId));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    try {
      await clinicalNotes.create({ patient_id: patientId, note: noteText, note_type: 'general' });
      setNoteText('');
      setShowNoteForm(false);
      load();
    } catch { /* silent */ }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) { case 'active': case 'evaluation': return 'success'; case 'completed': return 'info'; case 'paused': case 'discontinued': return 'warning'; default: return 'neutral'; }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!patient) {
    return <div className="text-center py-12 text-slate-500">Paciente no encontrado</div>;
  }

  const tabs = [
    { key: 'timeline', label: 'Línea de Tiempo', icon: Clock },
    { key: 'notes', label: 'Notas Clínicas', icon: FileText },
    { key: 'tms', label: 'Perfiles TMS', icon: Brain },
    { key: 'sessions', label: 'Sesiones', icon: Zap },
    { key: 'treatments', label: 'Tratamientos', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/app/pacientes')} className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /><span>Volver a Pacientes</span>
      </button>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold text-slate-600">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
                <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                  <span className="flex items-center space-x-1"><Phone className="w-3.5 h-3.5" /><span>{patient.phone}</span></span>
                  {patient.email && <span className="flex items-center space-x-1"><Mail className="w-3.5 h-3.5" /><span>{patient.email}</span></span>}
                  {patient.birthdate && <span className="flex items-center space-x-1"><Calendar className="w-3.5 h-3.5" /><span>{patient.birthdate}</span></span>}
                </div>
              </div>
            </div>
            <Badge variant={statusVariant(patient.status)}>
              {patient.status === 'active' ? 'Activo' : patient.status === 'inactive' ? 'Inactivo' : 'Dado de alta'}
            </Badge>
          </div>
        </CardBody>
      </Card>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'timeline' && (
        <Card><CardBody><TimelineComponent events={timeline} /></CardBody></Card>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowNoteForm(true)} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">+ Nota</button>
          </div>
          {notes.length === 0 ? (
            <Card><CardBody><p className="text-center text-slate-400 py-8">Sin notas clínicas</p></CardBody></Card>
          ) : (
            notes.map(n => (
              <Card key={n.id}><CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-900">{n.note}</p>
                    <p className="text-xs text-slate-400 mt-1">{n.therapist_name || 'Terapeuta'} — {new Date(n.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <Badge variant="neutral">{n.note_type}</Badge>
                </div>
              </CardBody></Card>
            ))
          )}
          <Modal isOpen={showNoteForm} onClose={() => setShowNoteForm(false)} title="Nueva Nota Clínica" size="md"
            footer={<>
              <button onClick={() => setShowNoteForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
              <button onClick={saveNote} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">Guardar</button>
            </>}>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Escribe la nota clínica..." />
          </Modal>
        </div>
      )}

      {activeTab === 'tms' && (
        <div className="space-y-4">
          {profiles.length === 0 ? (
            <Card><CardBody><p className="text-center text-slate-400 py-8">Sin perfiles TMS</p></CardBody></Card>
          ) : (
            profiles.map(pr => (
              <Card key={pr.id}><CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{pr.protocol_name || `Protocolo #${pr.protocol_id}`}</p>
                    <p className="text-sm text-slate-500">{pr.assigned_diagnosis}</p>
                  </div>
                  <Badge variant={statusVariant(pr.status)}>
                    {pr.status === 'active' ? 'Activo' : pr.status === 'evaluation' ? 'Evaluación' : pr.status === 'completed' ? 'Completado' : 'Interrumpido'}
                  </Badge>
                </div>
              </CardBody></Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card><CardBody><p className="text-center text-slate-400 py-8">Sin sesiones TMS registradas</p></CardBody></Card>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-medium text-slate-500 mb-3">Curva de Respuesta Clínica</div>
                {responses.length > 1 ? (
                  <ProgressCurve responses={responses} />
                ) : (
                  <p className="text-center text-slate-400 text-xs py-4">Mínimo 2 sesiones para mostrar curva</p>
                )}
              </div>
              {sessions.map(s => {
                const resp = responses.find(r => r.tms_session_id === s.id);
                return (
                  <Card key={s.id}><CardBody>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{s.session_number}</span>
                        <Badge variant={s.status === 'completed' ? 'success' : s.status === 'in_progress' ? 'info' : s.status === 'cancelled' ? 'danger' : 'neutral'}>
                          {s.status === 'completed' ? 'Completada' : s.status === 'in_progress' ? 'En curso' : s.status === 'scheduled' ? 'Programada' : s.status === 'no_show' ? 'No asistió' : 'Cancelada'}
                        </Badge>
                      </div>
                      {s.completed_at && <span className="text-[10px] text-slate-400">{new Date(s.completed_at).toLocaleDateString('es-MX')}</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                      <div><span className="text-slate-500">Frecuencia</span><div className="font-mono text-slate-900">{s.frequency_hz} Hz</div></div>
                      <div><span className="text-slate-500">Intensidad</span><div className="font-mono text-slate-900">{s.intensity_pct_mt}% MT</div></div>
                      <div><span className="text-slate-500">Pulsos</span><div className="font-mono text-slate-900">{s.pulses_delivered}</div></div>
                      <div><span className="text-slate-500">Duración</span><div className="font-mono text-slate-900">{s.session_duration_min} min</div></div>
                    </div>
                    <div className="mt-1 text-[10px]"><span className="text-slate-500">Área: </span><span className="text-slate-700">{s.target_area}</span></div>
                    {resp && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex gap-3 text-[10px]">
                        <div><span className="text-slate-500">Ánimo: </span><span className="font-mono text-slate-900">{resp.mood_score}/10</span></div>
                        {resp.energy_score != null && <div><span className="text-slate-500">Energía: </span><span className="font-mono text-slate-900">{resp.energy_score}/10</span></div>}
                        {resp.anxiety_score != null && <div><span className="text-slate-500">Ansiedad: </span><span className="font-mono text-slate-900">{resp.anxiety_score}/10</span></div>}
                        {resp.overall_response != null && <div><span className="text-slate-500">Global: </span><span className="font-mono text-slate-900">{resp.overall_response}/10</span></div>}
                      </div>
                    )}
                  </CardBody></Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {activeTab === 'treatments' && (
        <div className="space-y-4">
          {patientTreatments.length === 0 ? (
            <Card><CardBody><p className="text-center text-slate-400 py-8">Sin tratamientos</p></CardBody></Card>
          ) : (
            patientTreatments.map(t => (
              <Card key={t.id}><CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.completed_sessions}/{t.total_sessions} sesiones</p>
                  </div>
                  <Badge variant={statusVariant(t.status)}>
                    {t.status === 'active' ? 'Activo' : t.status === 'completed' ? 'Completado' : t.status === 'paused' ? 'Pausado' : 'Cancelado'}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.round((t.completed_sessions / t.total_sessions) * 100)}%` }} />
                  </div>
                </div>
              </CardBody></Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProgressCurve({ responses }: { responses: ClinicalResponseType[] }) {
  const sorted = [...responses].sort((a, b) => a.id - b.id);
  const series = [
    { name: 'Ánimo', data: sorted.map(r => r.mood_score), color: '#0d9488' },
    ...(sorted.some(r => r.overall_response != null) ? [{ name: 'Global', data: sorted.map(r => r.overall_response ?? 0), color: '#8b5cf6', dashed: true }] : []),
  ];
  return <LineChartViz series={series} />;
}
