import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { tmsEngine, type DashboardStats } from '../lib/api';

export default function Dashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await tmsEngine.getDashboard();
      setData(res.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <p className="text-slate-500">
          {language === 'es' ? 'Error al cargar dashboard' : 'Error loading dashboard'}
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: language === 'es' ? 'Pacientes Activos' : 'Active Patients',
      value: data.active_patients,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: language === 'es' ? 'Sesiones Hoy' : "Today's Sessions",
      value: data.sessions_today,
      icon: Calendar,
      color: 'bg-teal-500',
    },
    {
      label: language === 'es' ? 'Mejorando' : 'Improving',
      value: data.response_rates.improving,
      icon: TrendingUp,
      color: 'bg-emerald-500',
    },
    {
      label: language === 'es' ? 'Estable' : 'Stable',
      value: data.response_rates.stable,
      icon: Activity,
      color: 'bg-amber-500',
    },
    {
      label: language === 'es' ? 'Empeorando' : 'Declining',
      value: data.response_rates.declining,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy-900">
            {language === 'es' ? 'Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1">
            {language === 'es'
              ? `Bienvenido, ${user?.email}`
              : `Welcome, ${user?.email}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-navy-900">
                {language === 'es' ? 'Protocolos Utilizados' : 'Protocol Distribution'}
              </h2>
            </div>
            <div className="p-4">
              {data.protocol_distribution.length === 0 ? (
                <p className="text-center text-slate-500">
                  {language === 'es' ? 'Sin datos' : 'No data'}
                </p>
              ) : (
                <div className="space-y-3">
                  {data.protocol_distribution.map((item: { name: string; count: number }, index: number) => (
                    <div key={index} className="flex items-center">
                      <span className="text-sm font-medium text-navy-900 w-32 truncate">{item.name}</span>
                      <div className="flex-1 mx-3">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{
                              width: `${(item.count / data.active_patients) * 100 || 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-navy-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-navy-900">
                {language === 'es' ? 'Respuesta Clínica' : 'Clinical Response'}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{language === 'es' ? 'Mejorando' : 'Improving'}</span>
                <span className="text-sm font-semibold text-emerald-600">{data.response_rates.improving}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{language === 'es' ? 'Estable' : 'Stable'}</span>
                <span className="text-sm font-semibold text-amber-600">{data.response_rates.stable}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{language === 'es' ? 'Empeorando' : 'Declining'}</span>
                <span className="text-sm font-semibold text-red-600">{data.response_rates.declining}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/patients')}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-navy-900">
                  {language === 'es' ? 'Pacientes' : 'Patients'}
                </p>
                <p className="text-xs text-slate-500">
                  {language === 'es' ? 'Gestionar pacientes' : 'Manage patients'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/calendar')}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-navy-900">
                  {language === 'es' ? 'Agenda' : 'Calendar'}
                </p>
                <p className="text-xs text-slate-500">
                  {language === 'es' ? 'Ver calendario' : 'View calendar'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/citas')}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-navy-900">
                  {language === 'es' ? 'Citas' : 'Appointments'}
                </p>
                <p className="text-xs text-slate-500">
                  {language === 'es' ? 'Gestionar citas' : 'Manage appointments'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
