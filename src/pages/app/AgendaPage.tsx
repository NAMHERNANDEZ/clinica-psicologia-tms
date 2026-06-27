import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { appointments, patients, therapists, type Appointment, type Patient, type Therapist } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';

export default function AgendaPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<Array<{ id: string; title: string; start: string; end: string; color: string; extendedProps: Record<string, unknown> }>>([]);
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [therapistList, setTherapistList] = useState<Therapist[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [form, setForm] = useState({ patient_id: 0, therapist_id: 0, duration: 30, notes: '' });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [apptsRes, pRes, thRes] = await Promise.allSettled([
        appointments.list(), patients.list(), therapists.list(),
      ]);
      if (apptsRes.status === 'fulfilled') {
        const appts = (apptsRes.value.data || []) as Appointment[];
        setEvents(appts.map(a => ({
          id: String(a.id),
          title: `${a.patient_name || `Paciente #${a.patient_id}`} — ${a.therapist_name || `Terapeuta #${a.therapist_id}`}`,
          start: `${a.date}T${a.time}`,
          end: calculateEnd(a.date, a.time, a.duration),
          color: statusColor(a.status),
          extendedProps: { ...a },
        })));
      }
      if (pRes.status === 'fulfilled') setPatientList(pRes.value.data || []);
      if (thRes.status === 'fulfilled') setTherapistList(thRes.value.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const calculateEnd = (date: string, time: string, duration: number) => {
    const d = new Date(`${date}T${time}`);
    d.setMinutes(d.getMinutes() + duration);
    return d.toISOString().slice(0, 16);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'scheduled': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'no_show': return '#f59e0b';
      case 'rescheduled': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  const handleDateSelect = (selectInfo: { start: Date; end: Date }) => {
    setSelectedSlot({ start: selectInfo.start, end: selectInfo.end });
    setShowForm(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const apt = clickInfo.event.extendedProps as Appointment;
    setForm({ patient_id: apt.patient_id, therapist_id: apt.therapist_id, duration: apt.duration, notes: apt.notes || '' });
  };

  const saveAppointment = async () => {
    if (!selectedSlot || !form.patient_id || !form.therapist_id) return;
    const date = selectedSlot.start.toISOString().split('T')[0];
    const time = selectedSlot.start.toTimeString().slice(0, 5);
    try {
      await appointments.create({ patient_id: form.patient_id, therapist_id: form.therapist_id, date, time, duration: form.duration, status: 'scheduled', notes: form.notes });
      setShowForm(false);
      load();
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">Calendario de citas y sesiones</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setView('dayGridMonth')} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === 'dayGridMonth' ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'}`}>Mes</button>
          <button onClick={() => setView('timeGridWeek')} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === 'timeGridWeek' ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'}`}>Semana</button>
          <button onClick={() => setView('timeGridDay')} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === 'timeGridDay' ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'}`}>Día</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events={events}
          height="auto"
          locale="es"
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
        />
      </div>

      <div className="flex items-center space-x-4 text-xs text-slate-500">
        <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-blue-500" /><span>Programada</span></span>
        <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /><span>Completada</span></span>
        <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-red-500" /><span>Cancelada</span></span>
        <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-amber-500" /><span>No asistió</span></span>
        <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-purple-500" /><span>Reprogramada</span></span>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva Cita" size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
          <button onClick={saveAppointment} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">Crear Cita</button>
        </>}>
        <div className="space-y-4">
          {selectedSlot && (
            <p className="text-sm text-slate-600">{selectedSlot.start.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — {selectedSlot.start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paciente *</label>
            <select value={form.patient_id || ''} onChange={e => setForm({ ...form, patient_id: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value="">Seleccionar paciente...</option>
              {patientList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Terapeuta *</label>
            <select value={form.therapist_id || ''} onChange={e => setForm({ ...form, therapist_id: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value="">Seleccionar terapeuta...</option>
              {therapistList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
            <select value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
              <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
