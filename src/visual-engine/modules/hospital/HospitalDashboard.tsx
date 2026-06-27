import { useState, useEffect } from 'react';
import { cos } from '../../../lib/api';

interface HospitalKPI {
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
}

interface DashboardData {
  waiting: number;
  in_session: number;
  completed: number;
  total: number;
  tasks_urgent: number;
  tasks_high: number;
  alerts_critical: number;
  patients_total: number;
}

export default function HospitalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [todayRes, tasksRes, alertsRes] = await Promise.allSettled([
        cos.getToday(),
        cos.getTasks(),
        cos.getAlerts(),
      ]);

      const today = (todayRes.status === 'fulfilled' ? (todayRes.value as { data?: Record<string, unknown> }).data : null) || {};
      const tasks = (tasksRes.status === 'fulfilled' ? (tasksRes.value as { data?: { stats?: Record<string, number> } }).data : null) || {};
      const alerts = (alertsRes.status === 'fulfilled' ? (alertsRes.value as { data?: { stats?: Record<string, number> } }).data : null) || {};

      setData({
        waiting: Array.isArray(today.waiting) ? today.waiting.length : 0,
        in_session: Array.isArray(today.in_session) ? today.in_session.length : 0,
        completed: Array.isArray(today.completed) ? today.completed.length : 0,
        total: (today.total_appointments as number) || 0,
        tasks_urgent: tasks.stats?.urgent || 0,
        tasks_high: tasks.stats?.high || 0,
        alerts_critical: alerts.stats?.critical || 0,
        patients_total: (today.patients_without_appointment as unknown[])?.length || 0,
      });
    } catch { /* silent */ } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const kpis: HospitalKPI[] = [
    { label: 'En Espera', value: data.waiting, color: 'from-amber-500 to-orange-500', icon: '⏳' },
    { label: 'En Sesión', value: data.in_session, color: 'from-blue-500 to-cyan-500', icon: '💊' },
    { label: 'Completadas', value: data.completed, color: 'from-emerald-500 to-green-500', icon: '✓' },
    { label: 'Total Hoy', value: data.total, color: 'from-purple-500 to-pink-500', icon: '📊' },
    { label: 'Urgentes', value: data.tasks_urgent, color: 'from-red-500 to-rose-500', icon: '🔴' },
    { label: 'Alertas Críticas', value: data.alerts_critical, color: 'from-red-600 to-red-400', icon: '⚠️' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Hospital</h2>
          <p className="text-sm text-slate-500">Vista operacional en tiempo real</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Actualizado</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{kpi.icon}</span>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <span className="text-white text-lg font-bold">{typeof kpi.value === 'number' ? kpi.value : ''}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}{kpi.unit || ''}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Flujo de Pacientes</h3>
          <div className="space-y-3">
            {[
              { label: 'En Espera', value: data.waiting, max: data.total, color: 'bg-amber-400' },
              { label: 'En Tratamiento', value: data.in_session, max: data.total, color: 'bg-blue-400' },
              { label: 'Completadas', value: data.completed, max: data.total, color: 'bg-emerald-400' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-medium text-slate-900">{item.value}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${data.total > 0 ? (item.value / data.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Carga de Trabajo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-slate-900">{data.tasks_urgent + data.tasks_high}</p>
              <p className="text-xs text-slate-500 mt-1">Tareas Pendientes</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-slate-900">{data.alerts_critical}</p>
              <p className="text-xs text-slate-500 mt-1">Alertas Críticas</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-emerald-600">{data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0}%</p>
              <p className="text-xs text-slate-500 mt-1">Tasa de Completado</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">{data.in_session}</p>
              <p className="text-xs text-slate-500 mt-1">Sesiones Activas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
