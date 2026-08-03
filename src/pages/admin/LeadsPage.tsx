import { useCallback, useEffect, useState } from 'react';
import { Phone, MapPin, Briefcase, ArrowLeft, CheckCircle2, Clock, UserX, Users, Search, Mail, StickyNote, Trash2, Pencil, X, Calendar } from 'lucide-react';
import { leads, appointments, LEAD_ESTADOS, type Lead, type LeadEstado, type LeadAuditEntry, type LeadNote } from '../../lib/api';

type Filter = 'TODOS' | LeadEstado;

const ESTADO_STYLE: Record<LeadEstado, string> = {
  NUEVO: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  CONTACTADO: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  CITA_CONFIRMADA: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ATENDIDO: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  CERRADO: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const ESTADO_LABEL: Record<LeadEstado, string> = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  CITA_CONFIRMADA: 'Cita confirmada',
  ATENDIDO: 'Atendido',
  CERRADO: 'Cerrado',
};

const FILTERS: Filter[] = ['TODOS', ...LEAD_ESTADOS];
const ORIGENES = ['chat', 'form', 'manual'] as const;

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function EstadoBadge({ estado }: { estado: LeadEstado }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ESTADO_STYLE[estado] || ESTADO_STYLE.NUEVO}`}>
      {ESTADO_LABEL[estado] || estado}
    </span>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}

function Field({ icon, label, value }: FieldProps) {
  return (
    <div className="flex items-start gap-2 text-slate-300">
      {icon}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

interface EditFormProps {
  lead: Lead;
  onCancel: () => void;
  onSave: (fields: Partial<Pick<Lead, 'nombre' | 'telefono' | 'email' | 'ciudad' | 'servicio_interesado' | 'motivo'>>) => Promise<void>;
  busy: boolean;
}

function EditForm({ lead, onCancel, onSave, busy }: EditFormProps) {
  const [nombre, setNombre] = useState(lead.nombre || '');
  const [telefono, setTelefono] = useState(lead.telefono || '');
  const [email, setEmail] = useState(lead.email || '');
  const [ciudad, setCiudad] = useState(lead.ciudad || '');
  const [servicio, setServicio] = useState(lead.servicio_interesado || '');
  const [motivo, setMotivo] = useState(lead.motivo || '');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-white">Editar lead</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="input bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="input bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
        <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ciudad" className="input bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
        <input value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Servicio de interés" className="input bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de consulta" className="input bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy}
          onClick={() => onSave({ nombre, telefono, email, ciudad, servicio_interesado: servicio, motivo })}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300">
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface LeadDetailProps {
  lead: Lead;
  audit: LeadAuditEntry[];
  notes: LeadNote[];
  onBack: () => void;
  onChangeEstado: (id: number, estado: LeadEstado) => Promise<void>;
  onAddNote: (id: number, note: string) => Promise<void>;
  onSaveEdit: (id: number, v: Partial<Pick<Lead, 'nombre' | 'telefono' | 'email' | 'ciudad' | 'servicio_interesado' | 'motivo'>>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onCreateAppointment: (leadId: number, data: { date: string; time: string; type: string }) => Promise<void>;
  busy: boolean;
}

function LeadDetail({ lead, audit, notes, onBack, onChangeEstado, onAddNote, onSaveEdit, onDelete, onCreateAppointment, busy }: LeadDetailProps) {
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [showAppt, setShowAppt] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('10:00');
  const [apptType, setApptType] = useState('CONSULTA');

  const action = (estado: LeadEstado, label: string, icon: React.ReactNode, cls: string, disabled: boolean) => (
    <button
      disabled={busy || disabled}
      onClick={() => onChangeEstado(lead.id, estado)}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${cls}`}
    >
      {icon}
      {label}
    </button>
  );

  const submitNote = async () => {
    if (!note.trim()) return;
    await onAddNote(lead.id, note.trim());
    setNote('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          Volver a la lista
        </button>
        <button
          onClick={() => { if (confirm('¿Eliminar este lead? Se conserva el historial.')) onDelete(lead.id); }}
          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Lead #{lead.id}</h2>
            <EstadoBadge estado={lead.estado} />
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300"
          >
            {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {editing ? 'Cancelar edición' : 'Editar'}
          </button>
        </div>

        {editing ? (
          <EditForm lead={lead} onCancel={() => setEditing(false)} onSave={(v) => onSaveEdit(lead.id, v).then(() => setEditing(false))} busy={busy} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={<Users className="w-4 h-4 mt-0.5 text-slate-500" />} label="Nombre" value={lead.nombre} />
              <Field icon={<Phone className="w-4 h-4 mt-0.5 text-slate-500" />} label="Teléfono" value={lead.telefono} />
              <Field icon={<Mail className="w-4 h-4 mt-0.5 text-slate-500" />} label="Email" value={lead.email} />
              <Field icon={<MapPin className="w-4 h-4 mt-0.5 text-slate-500" />} label="Ciudad" value={lead.ciudad} />
              <Field icon={<Briefcase className="w-4 h-4 mt-0.5 text-slate-500" />} label="Servicio" value={lead.servicio_interesado} />
              <Field icon={<StickyNote className="w-4 h-4 mt-0.5 text-slate-500" />} label="Motivo" value={lead.motivo} />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Recibido: {formatDate(lead.fecha_creacion)}</span>
              {lead.origen && <span className="text-slate-600">· origen: {lead.origen}</span>}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {action('CONTACTADO', 'Contactar', <Phone className="w-4 h-4" />, 'bg-blue-600 hover:bg-blue-500 text-white', lead.estado === 'CONTACTADO' || lead.estado === 'ATENDIDO' || lead.estado === 'CERRADO')}
              {action('CITA_CONFIRMADA', 'Confirmar cita', <CheckCircle2 className="w-4 h-4" />, 'bg-emerald-600 hover:bg-emerald-500 text-white', lead.estado === 'CITA_CONFIRMADA' || lead.estado === 'ATENDIDO' || lead.estado === 'CERRADO')}
              {action('CERRADO', 'Cerrar', <UserX className="w-4 h-4" />, 'bg-slate-700 hover:bg-slate-600 text-white', lead.estado === 'CERRADO')}
            </div>

            <div className="mt-3">
              <button
                onClick={() => setShowAppt((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300"
              >
                <Calendar className="w-4 h-4" />
                {showAppt ? 'Cancelar' : 'Crear cita'}
              </button>
            </div>

            {showAppt && (
              <div className="mt-3 bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
                  <input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
                  <select value={apptType} onChange={(e) => setApptType(e.target.value)} className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white">
                    <option value="CONSULTA">Consulta</option>
                    <option value="TMS">TMS</option>
                    <option value="SEGUIMIENTO">Seguimiento</option>
                  </select>
                </div>
                <button
                  disabled={busy || !apptDate}
                  onClick={() => onCreateAppointment(lead.id, { date: apptDate, time: apptTime, type: apptType }).then(() => setShowAppt(false))}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40"
                >
                  Programar cita
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Notas</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitNote()}
            placeholder="Escribe una nota de seguimiento..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button onClick={submitNote} disabled={busy || !note.trim()} className="px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40">
            Agregar
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-600">Sin notas todavía.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="text-sm flex flex-wrap items-start gap-2 text-slate-400">
                <StickyNote className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                <span className="flex-1">{n.note}</span>
                <span className="text-xs text-slate-600">{n.usuario || 'admin'} · {formatDate(n.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {audit.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Auditoría</h3>
          <ul className="space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="text-sm flex flex-wrap items-center gap-2 text-slate-400">
                <span className="text-slate-600">{formatDate(a.fecha)}</span>
                <span>{a.usuario || 'admin'}</span>
                <span className="text-slate-600">·</span>
                <span>{a.accion === 'cambio_estado' ? 'Cambio de estado' : a.accion === 'nota' ? 'Nota agregada' : a.accion === 'edicion_datos' ? 'Edición de datos' : a.accion === 'eliminacion' ? 'Eliminado' : a.accion}</span>
                {a.estado_anterior && a.estado_nuevo && (
                  <span className="text-slate-600">
                    {a.estado_anterior || '—'} → {a.estado_nuevo || '—'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [data, setData] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('TODOS');
  const [origen, setOrigen] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [audit, setAudit] = useState<LeadAuditEntry[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        leads.list({ estado: filter === 'TODOS' ? undefined : filter, origen: origen || undefined, buscar: debouncedSearch || undefined }),
        leads.stats(),
      ]);
      setData(listRes.data);
      setStats(statsRes.data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar leads');
    } finally {
      setLoading(false);
    }
  }, [filter, origen, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (lead: Lead) => {
    setSelected(lead);
    setAudit([]);
    setNotes([]);
    try {
      const res = await leads.get(lead.id);
      setSelected(res.data);
      setAudit(res.data.audit || []);
      setNotes(res.data.notes || []);
    } catch {
      setAudit([]);
      setNotes([]);
    }
  };

  const refreshDetail = async (id: number) => {
    const res = await leads.get(id);
    setSelected(res.data);
    setAudit(res.data.audit || []);
    setNotes(res.data.notes || []);
    load();
  };

  const changeEstado = async (id: number, estado: LeadEstado) => {
    setBusy(true);
    try {
      await leads.updateEstado(id, estado);
      await refreshDetail(id);
    } catch (e: any) {
      setError(e?.message || 'Error al actualizar estado');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (id: number, note: string) => {
    setBusy(true);
    try {
      await leads.addNote(id, note);
      await refreshDetail(id);
    } catch (e: any) {
      setError(e?.message || 'Error al agregar nota');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: number, v: Partial<Pick<Lead, 'nombre' | 'telefono' | 'email' | 'ciudad' | 'servicio_interesado' | 'motivo'>>) => {
    setBusy(true);
    try {
      await leads.update(id, v);
      await refreshDetail(id);
    } catch (e: any) {
      setError(e?.message || 'Error al guardar cambios');
    } finally {
      setBusy(false);
    }
  };

  const deleteLead = async (id: number) => {
    setBusy(true);
    try {
      await leads.remove(id);
      setSelected(null);
      load();
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar lead');
    } finally {
      setBusy(false);
    }
  };

  const createAppointment = async (leadId: number, data: { date: string; time: string; type: string }) => {
    setBusy(true);
    try {
      await appointments.create({ lead_id: leadId, date: data.date, time: data.time, type: data.type });
      await refreshDetail(leadId);
      load();
    } catch (e: any) {
      setError(e?.message || 'Error al crear cita');
    } finally {
      setBusy(false);
    }
  };

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-slate-500">Solicitudes capturadas por el chat IA</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-teal-400">{total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {!selected && (
        <>
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nombre, teléfono, email o ciudad..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="">Todos los orígenes</option>
              {ORIGENES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Estado filters */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === f
                    ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f === 'TODOS' ? 'Todos' : ESTADO_LABEL[f as LeadEstado]}
              </button>
            ))}
          </div>
        </>
      )}

      {selected ? (
        <LeadDetail
          lead={selected}
          audit={audit}
          notes={notes}
          onBack={() => setSelected(null)}
          onChangeEstado={changeEstado}
          onAddNote={addNote}
          onSaveEdit={saveEdit}
          onDelete={deleteLead}
          onCreateAppointment={createAppointment}
          busy={busy}
        />
      ) : (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              No hay leads con este filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => openDetail(lead)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-white">{lead.nombre || `Lead #${lead.id}`}</p>
                    <EstadoBadge estado={lead.estado} />
                  </div>
                  {lead.servicio_interesado && (
                    <p className="text-sm text-teal-400">{lead.servicio_interesado}</p>
                  )}
                  <p className="text-sm text-slate-400 mt-1">
                    {lead.telefono || 'Sin contacto'}{lead.email ? ` · ${lead.email}` : ''}{lead.ciudad ? ` · ${lead.ciudad}` : ''}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">{formatDate(lead.fecha_creacion)}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}