import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { leads } from '../../lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leads.stats()
      .then((res) => setStats(res.data))
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, []);

  const nuevo = stats['NUEVO'] || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500">Panel de administración de CLINICA_AI</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-blue-400">{nuevo}</p>
          <p className="text-sm text-slate-400 mt-1">Leads nuevos</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-3xl font-bold text-white">{loading ? '—' : Object.values(stats).reduce((a, b) => a + b, 0)}</p>
          <p className="text-sm text-slate-400 mt-1">Total de leads</p>
        </div>
        <Link
          to="/admin/leads"
          className="bg-teal-500/15 border border-teal-500/30 rounded-xl p-5 flex flex-col justify-between hover:bg-teal-500/25 transition-colors"
        >
          <Users className="w-6 h-6 text-teal-400" />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-teal-300">Gestionar leads</span>
            <ArrowRight className="w-4 h-4 text-teal-300" />
          </div>
        </Link>
      </div>

      <p className="text-sm text-slate-600">
        Próximos módulos: calendario, configuración, notificaciones.
      </p>
    </div>
  );
}
