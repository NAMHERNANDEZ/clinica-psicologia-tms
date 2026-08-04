import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, FileText, Stethoscope, Pill, ClipboardList, Calendar, Shield, FolderOpen, Activity, AlertTriangle, Brain, ChevronRight, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const t = localStorage.getItem('auth_token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function api(path: string) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function extractArray(data: any, key?: string): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (key && data[key]) return data[key];
  if (data.data) {
    if (Array.isArray(data.data)) return data.data;
    if (key && data.data[key]) return data.data[key];
  }
  return [];
}

type Tab = 'datos' | 'diagnosticos' | 'tratamientos' | 'notas' | 'tms' | 'medicamentos' | 'escalas' | 'documentos' | 'consentimientos' | 'timeline';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'datos', label: 'Datos', icon: User },
  { key: 'diagnosticos', label: 'Diagnosticos', icon: Stethoscope },
  { key: 'tratamientos', label: 'Tratamientos', icon: Activity },
  { key: 'notas', label: 'Notas clinicas', icon: FileText },
  { key: 'tms', label: 'TMS', icon: Brain },
  { key: 'medicamentos', label: 'Medicamentos', icon: Pill },
  { key: 'escalas', label: 'Escalas', icon: ClipboardList },
  { key: 'documentos', label: 'Documentos', icon: FolderOpen },
  { key: 'consentimientos', label: 'Consentimientos', icon: Shield },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
];

function Age({ birthdate }: { birthdate?: string }) {
  if (!birthdate) return <span className="text-slate-500">Sin fecha</span>;
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return <span>{age} anios</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value || <span className="text-slate-600">—</span>}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    completed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    paused: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
    draft: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    final: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    cosigned: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    evaluation: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    discontinued: 'bg-red-500/15 text-red-300 border-red-500/30',
    open: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    closed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.draft}`}>{status}</span>;
}

function DatosTab({ patient }: { patient: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Datos personales">
        <DataRow label="Nombre" value={patient.name} />
        <DataRow label="CURP" value={patient.curp} />
        <DataRow label="Genero" value={patient.gender} />
        <DataRow label="Fecha de nacimiento" value={patient.birthdate} />
        <DataRow label="Edad" value={patient.birthdate ? `${new Date().getFullYear() - new Date(patient.birthdate).getFullYear()} anios` : undefined} />
        <DataRow label="Estado civil" value={patient.marital_status} />
        <DataRow label="Ocupacion" value={patient.occupation} />
        <DataRow label="Nacionalidad" value={patient.nationality} />
        <DataRow label="Telefono" value={patient.phone} />
        <DataRow label="Email" value={patient.email} />
        <DataRow label="Estado" value={patient.status} />
      </Section>
      <Section title="Direccion">
        <DataRow label="Calle" value={patient.address_street} />
        <DataRow label="Ciudad" value={patient.address_city} />
        <DataRow label="Estado" value={patient.address_state} />
        <DataRow label="CP" value={patient.address_zip} />
      </Section>
      <Section title="Contacto de emergencia">
        <DataRow label="Nombre" value={patient.emergency_contact_name} />
        <DataRow label="Telefono" value={patient.emergency_contact_phone} />
        <DataRow label="Parentesco" value={patient.emergency_contact_relationship} />
      </Section>
      <Section title="Seguro medico">
        <DataRow label="Proveedor" value={patient.insurance_provider} />
        <DataRow label="No. Poliza" value={patient.insurance_id} />
      </Section>
      <Section title="Antecedentes clinicos">
        <DataRow label="Alergias" value={patient.allergies} />
        <DataRow label="Medicamentos actuales" value={patient.current_medications} />
        <DataRow label="Historial medico" value={patient.medical_history} />
        <DataRow label="Historial familiar" value={patient.family_history} />
        <DataRow label="Historial social" value={patient.social_history} />
        <DataRow label="Tipo de sangre" value={patient.blood_type} />
      </Section>
    </div>
  );
}

function DiagnosticosTab({ records }: { records: any[] }) {
  if (!records.length) return <div className="text-slate-500 text-sm py-8 text-center">No hay expedientes clinicos registrados</div>;
  return (
    <div className="space-y-3">
      {records.map((r: any) => (
        <div key={r.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Expediente #{r.id}</span>
            <div className="flex gap-2">
              <StatusBadge status={r.status || 'open'} />
              {r.version > 1 && <span className="text-xs text-slate-500">v{r.version}</span>}
            </div>
          </div>
          <DataRow label="Motivo de consulta" value={r.reason_consultation} />
          <DataRow label="Diagnostico" value={r.diagnosis} />
          <DataRow label="CIE-10" value={r.cie10_codes} />
          <DataRow label="Evaluacion" value={r.evaluation} />
          <DataRow label="Plan de tratamiento" value={r.treatment_plan} />
          <DataRow label="Alergias" value={r.allergies} />
          <DataRow label="Medicamentos" value={r.current_medications} />
          <div className="text-xs text-slate-500 mt-2">Creado: {new Date(r.created_at).toLocaleDateString('es-MX')}</div>
        </div>
      ))}
    </div>
  );
}

function TratamientosTab({ treatments, sessions }: { treatments: any[]; sessions: Record<number, any[]> }) {
  if (!treatments.length) return <div className="text-slate-500 text-sm py-8 text-center">No hay tratamientos registrados</div>;
  return (
    <div className="space-y-3">
      {treatments.map((t: any) => (
        <div key={t.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">{t.name}</span>
            <StatusBadge status={t.status} />
          </div>
          <DataRow label="Protocolo" value={t.protocol} />
          <DataRow label="Diagnostico" value={t.diagnosis_codes} />
          <DataRow label="Objetivos" value={t.treatment_goals} />
          <DataRow label="Frecuencia" value={t.frequency_per_week ? `${t.frequency_per_week}x/semana` : undefined} />
          <DataRow label="Sesiones" value={`${t.completed_sessions}/${t.total_sessions}`} />
          <DataRow label="Inicio" value={t.start_date} />
          <DataRow label="Terapeuta" value={t.therapist_name} />
          {sessions[t.id]?.length > 0 && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <span className="text-xs text-slate-400 font-semibold">Sesiones ({sessions[t.id].length})</span>
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                {sessions[t.id].map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <StatusBadge status={s.status} />
                    <span className="text-slate-300">#{s.session_number}</span>
                    {s.completed_at && <span className="text-slate-500">{new Date(s.completed_at).toLocaleDateString('es-MX')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NotasTab({ clinicalNotes, sessionNotes, patientId }: { clinicalNotes: any[]; sessionNotes: any[]; patientId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [template, setTemplate] = useState('SOAP');
  const [risk, setRisk] = useState('low');
  const [fields, setFields] = useState<any>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [noteVersion, setNoteVersion] = useState<Record<number, any[]>>({});
  const [loadingVersion, setLoadingVersion] = useState<Record<number, boolean>>({});

  const TEMPLATE_SECTIONS: Record<string, { key: string; label: string }[]> = {
    SOAP: [
      { key: 'motivo_consulta', label: 'Motivo de consulta' },
      { key: 'observaciones', label: 'Observaciones' },
      { key: 'evaluacion', label: 'Evaluacion' },
      { key: 'intervencion', label: 'Intervencion realizada' },
      { key: 'plan_terapeutico', label: 'Plan terapeutico' },
      { key: 'proxima_sesion', label: 'Proxima sesion' },
    ],
    DAP: [
      { key: 'dato', label: 'Dato' },
      { key: 'aspecto', label: 'Aspecto' },
      { key: 'plan', label: 'Plan' },
    ],
    BIRP: [
      { key: 'background', label: 'Background' },
      { key: 'identificacion', label: 'Identificacion' },
      { key: 'respuesta', label: 'Respuesta' },
      { key: 'plan', label: 'Plan' },
    ],
    Libre: [{ key: 'nota', label: 'Nota' }],
  };

  async function createNote() {
    setSaving(true); setError('');
    const structured: any = {};
    (TEMPLATE_SECTIONS[template] || []).forEach(s => { if (fields[s.key]) structured[s.key] = fields[s.key]; });
    const body: any = { patient_id: patientId, note_type: 'session' };
    if (template === 'Libre') {
      body.note = note;
      body.template_type = 'LIBRE';
    } else {
      body.template_type = template;
      body.fields_json = JSON.stringify(structured);
      body.note = (TEMPLATE_SECTIONS[template] || []).map(s => `${s.label}: ${fields[s.key] || ''}`).join('\n');
    }
    body.risk_level = risk;
    body.status = 'draft';
    try {
      const r = await fetch(`${API}/api/clinical-notes`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Error al crear nota'); return; }
      setShowForm(false); setFields({}); setNote(''); setRisk('low');
      window.location.reload();
    } catch { setError('Error de red'); }
    finally { setSaving(false); }
  }

  async function signNote(id: number) {
    const r = await fetch(`${API}/api/clinical-notes/${id}/sign`, { method: 'POST', headers: authHeaders() });
    if (r.ok) window.location.reload();
  }

  async function toggleVersions(id: number) {
    if (noteVersion[id]) { setNoteVersion((p: any) => { const c = { ...p }; delete c[id]; return c; }); return; }
    setLoadingVersion((p: any) => ({ ...p, [id]: true }));
    try {
      const d = await api(`/api/clinical-notes/${id}/versions`);
      setNoteVersion((p: any) => ({ ...p, [id]: extractArray(d, 'versions') }));
    } catch {}
    finally { setLoadingVersion((p: any) => ({ ...p, [id]: false })); }
  }

  const riskColors: Record<string, string> = { low: 'bg-emerald-500/15 text-emerald-300', medium: 'bg-amber-500/15 text-amber-300', high: 'bg-red-500/15 text-red-300', critical: 'bg-red-700/20 text-red-300' };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold">
          {showForm ? 'Cancelar' : '+ Nueva nota clinica'}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 rounded-lg border border-teal-500/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold">Plantilla</label>
              <select value={template} onChange={e => { setTemplate(e.target.value); setFields({}); }} className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm">
                <option value="SOAP">SOAP</option>
                <option value="DAP">DAP</option>
                <option value="BIRP">BIRP</option>
                <option value="Libre">Libre</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold">Riesgo clinico</label>
              <select value={risk} onChange={e => setRisk(e.target.value)} className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm">
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
                <option value="critical">Critico</option>
              </select>
            </div>
          </div>

          {template === 'Libre' ? (
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={6} placeholder="Contenido de la nota..." className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200" />
          ) : (
            <div className="space-y-3">
              {(TEMPLATE_SECTIONS[template] || []).map(s => (
                <div key={s.key}>
                  <label className="text-xs text-slate-400 font-semibold">{s.label}</label>
                  <textarea value={fields[s.key] || ''} onChange={e => setFields({ ...fields, [s.key]: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200" />
                </div>
              ))}
            </div>
          )}

          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="flex justify-end">
            <button onClick={createNote} disabled={saving} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}

      {clinicalNotes.length > 0 && (
        <Section title="Notas clinicas profesionales">
          <div className="space-y-3">
            {clinicalNotes.map((n: any) => (
              <div key={n.id} className="bg-slate-900/50 rounded p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString('es-MX')}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{n.template_type || n.note_type}</span>
                    {n.version > 1 && <span className="text-xs px-1.5 py-0.5 bg-blue-500/15 text-blue-300 rounded">v{n.version}</span>}
                    {n.risk_level && <span className={`text-xs px-1.5 py-0.5 rounded ${riskColors[n.risk_level] || ''}`}>{n.risk_level}</span>}
                  </div>
                  <StatusBadge status={n.status || 'draft'} />
                </div>
                {n.fields_json ? (
                  <div className="text-xs space-y-1 mt-1">
                    {(() => { try { return Object.entries(JSON.parse(n.fields_json)).map(([k, v]) => (
                      <div key={k}><span className="text-slate-500 capitalize font-semibold">{k.replace(/_/g, ' ')}:</span> <span className="text-slate-300">{String(v)}</span></div>
                    )); } catch { return <p className="text-slate-300">{n.note}</p>; } })()}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 mt-1">{n.note}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  {n.signed_at && <span className="text-emerald-400">Firmada</span>}
                  {n.cosigned_at && <span className="text-violet-400">Cofirmada</span>}
                  {n.is_locked === 1 && <span className="text-amber-400">Bloqueada</span>}
                  {n.signed_by && !n.cosigned_by && <button onClick={() => signNote(n.id)} className="text-violet-400 hover:text-violet-300 font-semibold">Cofirmar</button>}
                  {!n.signed_at && n.is_locked !== 1 && <button onClick={() => signNote(n.id)} className="text-emerald-400 hover:text-emerald-300 font-semibold">Firmar</button>}
                  <button onClick={() => toggleVersions(n.id)} className="text-blue-400 hover:text-blue-300 font-semibold">{noteVersion[n.id] ? 'Ocultar versiones' : 'Ver versiones'}</button>
                </div>
                {noteVersion[n.id] && (
                  <div className="mt-2 space-y-1">
                    {noteVersion[n.id].map((v: any) => (
                      <div key={v.id} className="text-xs bg-slate-800/50 rounded p-2">
                        <span className="text-slate-400">v{v.version}</span> - <span className="text-slate-300">{v.change_reason}</span> <span className="text-slate-500">({new Date(v.changed_at).toLocaleString('es-MX')})</span>
                        {v.changed_by_email && <span className="text-slate-500"> por {v.changed_by_email}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {!clinicalNotes.length && !sessionNotes.length && (
        <div className="text-slate-500 text-sm py-8 text-center">No hay notas clinicas registradas</div>
      )}
    </div>
  );
}

function TmsTab({ profiles, tmsSessions, responses, effects }: { profiles: any[]; tmsSessions: Record<number, any[]>; responses: any[]; effects: any[] }) {
  if (!profiles.length) return <div className="text-slate-500 text-sm py-8 text-center">No hay perfiles TMS registrados</div>;
  return (
    <div className="space-y-4">
      {profiles.map((p: any) => (
        <div key={p.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Perfil TMS #{p.id}</span>
            <StatusBadge status={p.status} />
          </div>
          <DataRow label="Protocolo" value={p.protocol_name} />
          <DataRow label="Diagnostico asignado" value={p.assigned_diagnosis} />
          <DataRow label="Baseline BDI" value={p.baseline_bdi} />
          <DataRow label="Baseline GAD-7" value={p.baseline_gad7} />
          <DataRow label="Baseline PHQ-9" value={p.baseline_phq9} />
          {tmsSessions[p.id]?.length > 0 && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <span className="text-xs text-slate-400 font-semibold">Sesiones TMS ({tmsSessions[p.id].length})</span>
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                {tmsSessions[p.id].map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <StatusBadge status={s.status} />
                    <span className="text-slate-300">#{s.session_number}</span>
                    <span className="text-slate-500">{s.target_area}</span>
                    <span className="text-slate-500">{s.intensity_pct_mt}% MT</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {responses.length > 0 && (
        <Section title="Respuesta clinica (TMS)">
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {responses.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">Sesion {r.tms_session_id}</span>
                <span className="text-blue-400">Animo: {r.mood_score}/10</span>
                {r.energy_score && <span className="text-emerald-400">Energia: {r.energy_score}/10</span>}
                {r.anxiety_score && <span className="text-amber-400">Ansiedad: {r.anxiety_score}/10</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {effects.length > 0 && (
        <Section title="Efectos adversos">
          <div className="space-y-1">
            {effects.map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <AlertTriangle className={`w-3 h-3 ${e.severity === 'severe' ? 'text-red-400' : e.severity === 'moderate' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-slate-300">{e.effect_type}</span>
                <span className="text-slate-500">{e.severity}</span>
                {e.resolved ? <span className="text-emerald-400">Resuelto</span> : <span className="text-amber-400">Activo</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function MedicamentosTab({ patient }: { patient: any }) {
  return (
    <Section title="Medicamentos">
      <DataRow label="Medicamentos actuales" value={patient.current_medications} />
      <DataRow label="Alergias" value={patient.allergies} />
    </Section>
  );
}

function EscalasTab({ assessments }: { assessments: any[] }) {
  if (!assessments.length) return <div className="text-slate-500 text-sm py-8 text-center">No hay escalas registradas</div>;
  return (
    <div className="space-y-2">
      {assessments.map((a: any) => (
        <div key={a.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
          <div>
            <span className="text-white text-sm font-medium">{a.type || a.scale_type}</span>
            <span className="text-slate-500 text-xs ml-2">{a.administered_at ? new Date(a.administered_at).toLocaleDateString('es-MX') : ''}</span>
          </div>
          <span className="text-lg font-bold text-white">{a.total_score ?? a.score}</span>
        </div>
      ))}
    </div>
  );
}

function DocumentosTab({ documents }: { documents: any[] }) {
  if (!documents.length) return <div className="text-slate-500 text-sm py-8 text-center">No hay documentos registrados</div>;
  return (
    <div className="space-y-2">
      {documents.map((d: any) => (
        <div key={d.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-white text-sm">{d.document_type}</span>
              {d.description && <span className="text-slate-500 text-xs ml-2">{d.description}</span>}
            </div>
          </div>
          <StatusBadge status={d.status} />
        </div>
      ))}
    </div>
  );
}

function ConsentimientosTab({ consents, patientId }: { consents: any[]; patientId: number }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState<string | null>(null);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/consents/templates?active=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      if (data.data?.templates) setTemplates(data.data.templates);
    } catch {}
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleCreate = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({
          patient_id: patientId,
          type: selectedTemplate.type,
          document_hash: btoa(selectedTemplate.content),
          accepted_at: new Date().toISOString(),
          template_id: selectedTemplate.id,
          version: selectedTemplate.version,
        }),
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/consents?patient_id=${patientId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      if (data.data?.consents) setConsents(data.data.consents);
      setShowCreate(false);
      setSelectedTemplate(null);
    } catch {}
    setLoading(false);
  };

  const handleSign = async (c: any) => {
    setSigning(c.id);
    try {
      const sigHash = btoa(`${c.id}-${Date.now()}-${localStorage.getItem('userId') || 'user'}`);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/consents/${c.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ signer_type: 'patient', signer_name: c.patient_name || 'Paciente', signature_hash: sigHash }),
      });
      if (res.ok) {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/api/consents?patient_id=${patientId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const data = await r.json();
        if (data.data?.consents) setConsents(data.data.consents);
      }
    } catch {}
    setSigning(null);
  };

  const handleRevoke = async (c: any) => {
    if (!window.confirm(`Revocar consentimiento "${c.type.replace(/_/g, ' ')}"?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/consents/${c.id}/revoke`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ reason: 'Revocado por usuario' }),
      });
      if (res.ok) {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/api/consents?patient_id=${patientId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const data = await r.json();
        if (data.data?.consents) setConsents(data.data.consents);
      }
    } catch {}
  };

  const lifecycleColor = (l: string) => {
    switch (l) {
      case 'draft': return 'bg-amber-500/20 text-amber-400';
      case 'pending_signature': return 'bg-blue-500/20 text-blue-400';
      case 'signed': return 'bg-green-500/20 text-green-400';
      case 'active': return 'bg-emerald-500/20 text-emerald-400';
      case 'expired': return 'bg-slate-500/20 text-slate-400';
      case 'revoked': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Consentimientos</h3>
        <button
          onClick={() => { setShowCreate(true); setSelectedTemplate(templates[0] || null); }}
          disabled={templates.length === 0 || loading}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg disabled:opacity-50"
        >
          + Nuevo consentimiento
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 space-y-3">
          <h4 className="text-white text-sm">Crear desde plantilla</h4>
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => setSelectedTemplate(templates.find(t => t.id === Number(e.target.value)) || null)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">Seleccionar plantilla</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.type.replace(/_/g, ' ')})</option>
            ))}
          </select>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={loading || !selectedTemplate} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded">Crear</button>
            <button onClick={() => { setShowCreate(false); setSelectedTemplate(null); }} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded">Cancelar</button>
          </div>
        </div>
      )}

      {consents.length === 0 && !showCreate && (
        <div className="text-slate-500 text-sm py-8 text-center">No hay consentimientos registrados</div>
      )}

      <div className="space-y-2">
        {consents.map((c: any) => (
          <div key={c.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm">{c.type.replace(/_/g, ' ')}</span>
                  {c.template_id && <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded">Plantilla</span>}
                  <span className={lifecycleColor(c.lifecycle || c.status || 'active')}> {c.lifecycle || c.status || 'active'} </span>
                </div>
                <div className="text-slate-500 text-xs mt-1 flex gap-4 flex-wrap">
                  <span>Creado: {new Date(c.created_at).toLocaleDateString('es-MX')}</span>
                  {c.accepted_at && <span>Aceptado: {new Date(c.accepted_at).toLocaleDateString('es-MX')}</span>}
                  {c.signed_at && <span>Firmado: {new Date(c.signed_at).toLocaleDateString('es-MX')}</span>}
                  {c.signed_by_name && <span>Por: {c.signed_by_name}</span>}
                </div>
                {c.revoked_reason && <div className="text-xs text-red-400 mt-1">Revocado: {c.revoked_reason}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.lifecycle === 'draft' && <button onClick={() => handleSign(c)} disabled={signing === c.id} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Firmar</button>}
                {c.lifecycle === 'signed' && <button onClick={() => handleSign(c)} disabled={signing === c.id} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">Refirmar</button>}
                {c.lifecycle !== 'revoked' && <button onClick={() => handleRevoke(c)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Revocar</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTab({ events }: { events: any[] }) {
  if (!events.length) return <div className="text-slate-500 text-sm py-8 text-center">No hay eventos en el timeline</div>;
  return (
    <div className="relative pl-6 space-y-3">
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-700" />
      {events.map((e: any) => (
        <div key={e.id} className="relative">
          <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-violet-500 border-2 border-slate-900" />
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{e.title}</span>
              <span className="text-xs text-slate-500">{new Date(e.created_at).toLocaleDateString('es-MX')}</span>
            </div>
            {e.description && <p className="text-xs text-slate-400">{e.description}</p>}
            <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 mt-1 inline-block">{e.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PatientChartPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('datos');
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [sessionsMap, setSessionsMap] = useState<Record<number, any[]>>({});
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tmsSessionsMap, setTmsSessionsMap] = useState<Record<number, any[]>>({} );
  const [responses, setResponses] = useState<any[]>([]);
  const [effects, setEffects] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  const id = parseInt(patientId || '0');

  const loadAll = useCallback(async () => {
    if (!id) { navigate('/app/patients'); return; }
    setLoading(true);
    try {
      const pRes = await api(`/api/patients/${id}`);
      setPatient(pRes.data);

      const results = await Promise.allSettled([
        api(`/api/clinical-records?patient_id=${id}`),
        api('/api/treatments'),
        api(`/api/clinical-notes/${id}`),
        api(`/api/session-notes?patient_id=${id}`),
        api(`/api/tms/profiles/patient/${id}`),
        api(`/api/tms/clinical-response/patient/${id}`),
        api(`/api/tms/adverse-effects/patient/${id}`),
        api(`/api/documents?patient_id=${id}`),
        api(`/api/consents?patient_id=${id}`),
        api(`/api/timeline/${id}`),
        api(`/api/assessments/patient/${id}`),
      ]);

      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null;

      setRecords(extractArray(get(results[1]), 'records'));
      const allT = extractArray(get(results[2]), 'treatments');
      setTreatments(allT.filter((t: any) => t.patient_id === id));

      setClinicalNotes(extractArray(get(results[3]), 'notes'));
      setSessionNotes(extractArray(get(results[4]), 'notes'));

      const profs = extractArray(get(results[5]));
      setProfiles(profs);
      setResponses(extractArray(get(results[6])));
      setEffects(extractArray(get(results[7])));
      setDocuments(extractArray(get(results[8]), 'documents'));
      setConsents(extractArray(get(results[9]), 'consents'));
      setTimeline(extractArray(get(results[10])));
      setAssessments(extractArray(get(results[10])));

      // Fetch TMS sessions per profile
      const tmsMap: Record<number, any[]> = {};
      for (const p of profs) {
        try {
          const sRes = await api(`/api/tms/sessions/${p.id}`);
          tmsMap[p.id] = extractArray(sRes);
        } catch { tmsMap[p.id] = []; }
      }
      setTmsSessionsMap(tmsMap);

      // Fetch treatment sessions per treatment
      const sessMap: Record<number, any[]> = {};
      for (const t of allT.filter((t: any) => t.patient_id === id)) {
        try {
          const sRes = await api(`/api/sessions/${t.id}`);
          sessMap[t.id] = extractArray(sRes, 'sessions');
        } catch { sessMap[t.id] = []; }
      }
      setSessionsMap(sessMap);
    } catch (err) {
      console.error('PatientChart load error:', err);
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>;
  if (!patient) return <div className="text-center py-10 text-slate-500">Paciente no encontrado</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white"><ChevronRight className="w-5 h-5 rotate-180" /></button>
        <User className="w-8 h-8 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
          <p className="text-slate-400 text-sm">
            {patient.birthdate && <Age birthdate={patient.birthdate} />}
            {patient.phone && <span className="ml-2">| {patient.phone}</span>}
            {patient.email && <span className="ml-2">| {patient.email}</span>}
          </p>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'datos' && <DatosTab patient={patient} />}
      {tab === 'diagnosticos' && <DiagnosticosTab records={records} />}
      {tab === 'tratamientos' && <TratamientosTab treatments={treatments} sessions={sessionsMap} />}
      {tab === 'notas' && <NotasTab clinicalNotes={clinicalNotes} sessionNotes={sessionNotes} patientId={id} />}
      {tab === 'tms' && <TmsTab profiles={profiles} tmsSessions={tmsSessionsMap} responses={responses} effects={effects} />}
      {tab === 'medicamentos' && <MedicamentosTab patient={patient} />}
      {tab === 'escalas' && <EscalasTab assessments={assessments} />}
      {tab === 'documentos' && <DocumentosTab documents={documents} />}
      {tab === 'consentimientos' && <ConsentimientosTab consents={consents} patientId={id} />}
      {tab === 'timeline' && <TimelineTab events={timeline} />}
    </div>
  );
}
