import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { appointments as appointmentsApi, type Appointment } from '../lib/api';
import Reminders from '../components/Reminders';

export default function Appointments() {
  const { language } = useLanguage();
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await appointmentsApi.list({ date: selectedDate });
      setAppointmentsList(res.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(language === 'es' ? '¿Eliminar esta cita?' : 'Delete this appointment?')) {
      return;
    }

    try {
      await appointmentsApi.delete(id);
      setAppointmentsList((prev) => prev.filter((apt) => apt.id !== id));
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="relative py-12 lg:py-16 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
              <Calendar className="w-5 h-5 text-teal-400" />
              <span className="text-teal-300 text-sm font-medium">
                {language === 'es' ? 'Agenda del Día' : 'Daily Schedule'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {language === 'es' ? 'Mis Citas' : 'My Appointments'}
            </h1>
            <p className="text-lg text-slate-300">
              {language === 'es'
                ? 'Gestiona tus citas y recordatorios'
                : 'Manage your appointments and reminders'}
            </p>
          </div>
        </div>
      </section>

      {/* Appointments Content */}
      <section className="py-8 bg-slate-50 min-h-[calc(100vh-300px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Reminders */}
          <Reminders />

          {/* Date Navigation */}
          <div className="mb-6 bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-navy-900" />
              </button>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-navy-900">
                  {formatDate(selectedDate)}
                </h2>
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  {language === 'es' ? 'Hoy' : 'Today'}
                </button>
              </div>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-navy-900" />
              </button>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-slate-500">
                  {language === 'es' ? 'Cargando citas...' : 'Loading appointments...'}
                </p>
              </div>
            ) : appointmentsList.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {language === 'es'
                    ? 'No hay citas programadas para este día'
                    : 'No appointments scheduled for this day'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointmentsList.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Clock className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-navy-900">
                            {formatTime(appointment.time)}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{appointment.patient_name}</span>
                          </div>
                          {appointment.therapist_name && (
                            <div className="flex items-center space-x-2 mt-1">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{appointment.therapist_name}</span>
                            </div>
                          )}
                          {appointment.notes && (
                            <p className="text-sm text-slate-500 mt-2">{appointment.notes}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => appointment.id && handleDelete(appointment.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
