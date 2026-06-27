import { useAuth } from '../context/AuthContext';
import ReceptionDashboard from './app/ReceptionDashboard';
import TherapistDashboard from './app/TherapistDashboard';
import { StatCard } from '../components/ui/Misc';
import { Users, Calendar, Activity, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Bienvenido, {user?.email}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pacientes" value="Ver" icon={Users} color="bg-blue-500" />
        <StatCard label="Agenda" value="Ver" icon={Calendar} color="bg-teal-500" />
        <StatCard label="Tratamientos" value="Ver" icon={Activity} color="bg-purple-500" />
        <StatCard label="TMS" value="Ver" icon={Brain} color="bg-indigo-500" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate('/app/pacientes')} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left">
          <Users className="w-8 h-8 text-blue-500 mb-3" />
          <p className="font-semibold text-slate-900">Pacientes</p>
          <p className="text-xs text-slate-500 mt-1">Gestionar pacientes</p>
        </button>
        <button onClick={() => navigate('/app/agenda')} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left">
          <Calendar className="w-8 h-8 text-teal-500 mb-3" />
          <p className="font-semibold text-slate-900">Agenda</p>
          <p className="text-xs text-slate-500 mt-1">Calendario de citas</p>
        </button>
        <button onClick={() => navigate('/app/tms')} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left">
          <Brain className="w-8 h-8 text-purple-500 mb-3" />
          <p className="font-semibold text-slate-900">Módulo TMS</p>
          <p className="text-xs text-slate-500 mt-1">Protocolos y sesiones</p>
        </button>
        <button onClick={() => navigate('/app/tms/simulador')} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left">
          <Activity className="w-8 h-8 text-indigo-500 mb-3" />
          <p className="font-semibold text-slate-900">Simulador</p>
          <p className="text-xs text-slate-500 mt-1">Comparar protocolos</p>
        </button>
      </div>
    </div>
  );
}

function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Dashboard</h1>
        <p className="text-sm text-slate-500">Bienvenido, {user?.email}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/app/citas')} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left">
          <Calendar className="w-8 h-8 text-teal-500 mb-3" />
          <p className="font-semibold text-slate-900">Mis Citas</p>
          <p className="text-xs text-slate-500 mt-1">Ver y agendar citas</p>
        </button>
      </div>
    </div>
  );
}

export default function DashboardRouter() {
  const { user } = useAuth();
  const role = user?.role || 'patient';

  switch (role) {
    case 'admin': return <AdminDashboard />;
    case 'therapist': return <TherapistDashboard />;
    case 'reception': return <ReceptionDashboard />;
    default: return <PatientDashboard />;
  }
}
