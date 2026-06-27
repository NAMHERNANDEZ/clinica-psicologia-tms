import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Stethoscope, Brain, Activity, ArrowRight, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/ui/Misc';
import { Badge } from '../../components/ui/Badge';
import { journey, tmsEngine } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface PatientToday {
  id: number;
  name: string;
  appointment_time: string;
  treatment_name?: string;
  status: string;
  tms_profile?: { protocol_name: string; session_number: number };
}

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientsToday, setPatientsToday] = useState<PatientToday[]>([]);
  const [stats, setStats] = useState({ active_patients: 0, sessions_today: 0, response_rates: { improving: 0, stable: 0, declining: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [journeyRes, statsRes] = await Promise.allSettled([
        journey.getTherapist(),
        tmsEngine.getDashboard(),
      ]);
      if (journeyRes.status === 'fulfilled') {
        const d = (journeyRes.value as any).data as { patients_today?: PatientToday[] };
        setPatientsToday(d.patients_today || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats((statsRes.value as any).data as typeof stats);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (s) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'scheduled': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = { scheduled: 'Pendiente', completed: 'Atendido', in_progress: 'En curso', cancelled: 'Cancelado' };
    return m[s] || s;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const improving = stats.response_rates.improving;
  const stable = stats.response_rates.stable;
  const declining = stats.response_rates.declining;
  const totalResponses = improving + stable + declining || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Terapeuta</h1>
        <p className="text-sm text-slate-500">Bienvenido, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pacientes Hoy" value={patientsToday.length} icon={Users} color="bg-blue-500" />
        <StatCard label="Sesiones" value={stats.sessions_today} icon={Calendar} color="bg-teal-500" />
        <StatCard label="Tratamientos Activos" value={stats.active_patients} icon={Stethoscope} color="bg-purple-500" />
        <StatCard label="Mejorando" value={improving} icon={TrendingUp} color="bg-emerald-500" sublabel={`${Math.round((improving / totalResponses) * 100)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Pacientes de Hoy</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {patientsToday.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Sin pacientes programados hoy</div>
            ) : (
              patientsToday.map((p) => (
                <div key={p.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.appointment_time}
                        {p.tms_profile && ` — TMS: ${p.tms_profile.protocol_name} (Sesión ${p.tms_profile.session_number})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                    <button onClick={() => navigate(`/app/pacientes/${p.id}`)} className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Evolución Clínica</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Mejorando</span>
                <span className="text-sm font-semibold text-emerald-600">{improving}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(improving / totalResponses) * 100}%` }} />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-slate-600">Estable</span>
                <span className="text-sm font-semibold text-amber-600">{stable}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(stable / totalResponses) * 100}%` }} />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-slate-600">Empeorando</span>
                <span className="text-sm font-semibold text-red-600">{declining}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(declining / totalResponses) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Accesos Rápidos</h3>
            <div className="space-y-2">
              <button onClick={() => navigate('/app/tms')} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <Brain className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Módulo TMS</p>
                  <p className="text-xs text-slate-500">Perfiles y sesiones</p>
                </div>
              </button>
              <button onClick={() => navigate('/app/tms/simulador')} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <Activity className="w-5 h-5 text-teal-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Simulador</p>
                  <p className="text-xs text-slate-500">Comparar protocolos</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
