import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { appointments as appointmentsApi, type Appointment } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#f59e0b',
  confirmed: '#10b981',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

export default function CalendarPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const res = await appointmentsApi.list();
      setAppointmentsList(res.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const events = appointmentsList.map((apt) => ({
    id: String(apt.id),
    title: `${apt.patient_name || 'Paciente'} - ${apt.therapist_name || ''}`,
    start: `${apt.date}T${apt.time}`,
    end: `${apt.date}T${calculateEndTime(apt.time, apt.duration || 60)}`,
    backgroundColor: STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled,
    borderColor: STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled,
    extendedProps: {
      appointment: apt,
    },
  }));

  function calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }

  const handleEventClick = (info: any) => {
    const apt = info.event.extendedProps.appointment as Appointment;
    setSelectedEvent(apt);
    setIsModalOpen(true);
  };

  const handleDateClick = (info: { dateStr: string }) => {
    if (user?.role === 'admin' || user?.role === 'therapist') {
      setSelectedEvent({
        id: 0,
        clinic_id: 0,
        patient_id: 0,
        therapist_id: 0,
        date: info.dateStr.split('T')[0],
        time: '10:00',
        duration: 30,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      } as Appointment);
      setIsModalOpen(true);
    }
  };

  const handleStatusChange = async (appointmentId: number, newStatus: string) => {
    try {
      await appointmentsApi.update(appointmentId, { status: newStatus as Appointment['status'] });
      loadAppointments();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      es: {
        confirmed: 'Confirmada',
        scheduled: 'Programada',
        completed: 'Completada',
        cancelled: 'Cancelada',
      },
      en: {
        confirmed: 'Confirmed',
        scheduled: 'Scheduled',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
    };
    return labels[language]?.[status] || status;
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      <section className="relative py-12 lg:py-16 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
            <Calendar className="w-5 h-5 text-teal-400" />
            <span className="text-teal-300 text-sm font-medium">
              {language === 'es' ? 'Calendario' : 'Calendar'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {language === 'es' ? 'Agenda de Citas' : 'Appointment Schedule'}
          </h1>
        </div>
      </section>

      <section className="py-8 bg-slate-50 min-h-[calc(100vh-300px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => setView('dayGridMonth')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    view === 'dayGridMonth'
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {language === 'es' ? 'Mes' : 'Month'}
                </button>
                <button
                  onClick={() => setView('timeGridWeek')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    view === 'timeGridWeek'
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {language === 'es' ? 'Semana' : 'Week'}
                </button>
                <button
                  onClick={() => setView('timeGridDay')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    view === 'timeGridDay'
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {language === 'es' ? 'Día' : 'Day'}
                </button>
              </div>

              <div className="flex items-center space-x-4 text-sm">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-slate-600">{getStatusLabel(status)}</span>
                  </div>
                ))}
              </div>
            </div>

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={events}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              locale={language === 'es' ? 'es' : 'en'}
              height="auto"
              contentHeight={600}
              dayMaxEvents={3}
              nowIndicator={true}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              allDayText={language === 'es' ? 'Todo el día' : 'All day'}
              noEventsText={language === 'es' ? 'No hay eventos' : 'No events'}
            />
          </div>
        </div>
      </section>

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-navy-900 mb-4">
              {language === 'es' ? 'Detalle de Cita' : 'Appointment Details'}
            </h2>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-slate-500">{language === 'es' ? 'Paciente' : 'Patient'}</p>
                <p className="font-medium text-navy-900">{selectedEvent.patient_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'es' ? 'Terapeuta' : 'Therapist'}</p>
                <p className="font-medium text-navy-900">{selectedEvent.therapist_name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">{language === 'es' ? 'Fecha' : 'Date'}</p>
                  <p className="font-medium text-navy-900">{selectedEvent.date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'es' ? 'Hora' : 'Time'}</p>
                  <p className="font-medium text-navy-900">{selectedEvent.time}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === 'es' ? 'Estado' : 'Status'}</p>
                <p className="font-medium text-navy-900">{getStatusLabel(selectedEvent.status)}</p>
              </div>
            </div>

            {(user?.role === 'admin' || user?.role === 'therapist') && selectedEvent.id && (
              <div className="flex flex-wrap gap-2 mb-4">
                {['scheduled', 'confirmed', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(selectedEvent.id!, status)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedEvent.status === status
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
