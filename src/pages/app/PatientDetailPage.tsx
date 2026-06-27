import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, Activity, FileText, Clock, Brain } from 'lucide-react';
import { patients, timeline as timelineApi, clinicalNotes, tmsProfiles, treatments, type Patient, type TimelineEvent, type ClinicalNote, type TmsProfile, type Treatment } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Timeline as TimelineComponent } from '../../components/ui/Misc';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [profiles, setProfiles] = useState<TmsProfile[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<Treatment[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tms' | 'treatments'>('timeline');
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  const patientId = Number(id);

  useEffect(() => { if (patientId) load(); }, [patientId]);

  const load = async () => {
    try {
      const [pRes, tRes, nRes, prRes, trRes] = await Promise.allSettled([
        patients.get(patientId),
        timelineApi.listByPatient(patientId),
        clinicalNotes.listByPatient(patientId),
        tmsProfiles.listByPatient(patientId),
        treatments.list(),
      ]);
      if (pRes.status === 'fulfilled') setPatient(pRes.value.data);
      if (tRes.status === 'fulfilled') setTimeline(tRes.value.data || []);
      if (nRes.status === 'fulfilled') setNotes(nRes.value.data || []);
      if (prRes.status === 'fulfilled') setProfiles(prRes.value.data || []);
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
