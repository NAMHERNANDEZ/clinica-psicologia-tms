import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { StatCard } from '../../components/ui/Misc';
import { Badge } from '../../components/ui/Badge';
import { journey, appointments, alerts } from '../../lib/api';
import type { Appointment, Alert as AlertType } from '../../lib/api';

export default function ReceptionDashboard() {
  const navigate = useNavigate();
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<AlertType[]>([]);
  const [journeyData, setJourneyData] = useState<{ queue: Array<{ patient_id: number; patient_name: string; status: string; priority: string }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [apptsRes, alertsRes, journeyRes] = await Promise.allSettled([
        appointments.list({ date: today }),
        alerts.list(),
        journey.getReception(),
      ]);
      if (apptsRes.status === 'fulfilled') setDayAppointments(apptsRes.value.data || []);
      if (alertsRes.status === 'fulfilled') setPendingAlerts(alertsRes.value.data || []);
      if (journeyRes.status === 'fulfilled') setJourneyData((journeyRes.value as any).data as { queue: Array<{ patient_id: number; patient_name: string; status: string; priority: string }> });
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) {
      case 'completed': return 'success';
      case 'scheduled': return 'info';
      case 'cancelled': return 'danger';
      case 'no_show': return 'danger';
      default: return 'neutral';
    }
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = { scheduled: 'Programada', completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió', in_progress: 'En curso' };
    return m[s] || s;
  };

  const priorityVariant = (p: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (p) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = dayAppointments.filter(a => a.status === 'scheduled').slice(0, 5);
  const completedToday = dayAppointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recepción</h1>
        <p className="text-sm text-slate-500">Vista general del día — {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Citas Hoy" value={dayAppointments.length} icon={Calendar} color="bg-blue-500" />
        <StatCard label="Completadas" value={completedToday} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Pendientes" value={upcoming.length} icon={Clock} color="bg-amber-500" />
        <StatCard label="Alertas" value={pendingAlerts.length} icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Agenda del Día</h2>
            <button onClick={() => navigate('/app/agenda')} className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1">
              <span>Ver todo</span><ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {dayAppointments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Sin citas programadas hoy</div>
            ) : (
              dayAppointments.map((apt) => (
                <div key={apt.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                      {apt.patient_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{apt.patient_name || `Paciente #${apt.patient_id}`}</p>
                      <p className="text-xs text-slate-500">{apt.time} — {apt.therapist_name || `Terapeuta #${apt.therapist_id}`}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(apt.status)}>{statusLabel(apt.status)}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Fila de Espera</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {!journeyData?.queue || journeyData.queue.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Sin pacientes en espera</div>
              ) : (
                journeyData.queue.map((q, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{q.patient_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{q.status}</p>
                    </div>
                    <Badge variant={priorityVariant(q.priority)}>{q.priority}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {pendingAlerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Alertas Recientes</h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {pendingAlerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
