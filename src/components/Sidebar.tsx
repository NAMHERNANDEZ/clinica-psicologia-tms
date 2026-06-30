import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Users, Calendar, Stethoscope, Brain, LineChart,
  ClipboardList, Settings, ChevronLeft, ChevronRight, Activity,
  Eye, Monitor, MonitorSpeaker, Zap
} from 'lucide-react';

type NavItem = { path: string; label: string; icon: React.ElementType };
type NavSection = { label?: string; items: NavItem[] };

const navByRole: Record<string, NavSection[]> = {
  admin: [
    { items: [
      { path: '/app/dashboard', label: 'Dashboard', icon: Home },
      { path: '/app/pacientes', label: 'Pacientes', icon: Users },
      { path: '/app/agenda', label: 'Agenda', icon: Calendar },
      { path: '/app/tratamientos', label: 'Tratamientos', icon: Stethoscope },
    ]},
    { label: 'TMS', items: [
      { path: '/app/tms', label: 'Módulo TMS', icon: Brain },
      { path: '/app/tms/brain', label: 'Brain Viewer', icon: Activity },
      { path: '/app/tms/sesion', label: 'Sesión TMS', icon: Zap },
      { path: '/app/tms/simulador', label: 'Simulador', icon: LineChart },
    ]},
    { label: 'Visual Engine', items: [
      { path: '/app/visual/tms', label: 'Monitor TMS', icon: Monitor },
      { path: '/app/visual/hospital', label: 'Panel Hospital', icon: MonitorSpeaker },
      { path: '/app/visual/kiosk', label: 'Kiosk Recepción', icon: Eye },
    ]},
    { items: [
      { path: '/app/reportes', label: 'Reportes', icon: ClipboardList },
      { path: '/app/evaluaciones', label: 'Evaluaciones', icon: Activity },
      { path: '/app/configuracion', label: 'Configuración', icon: Settings },
    ]},
  ],
  therapist: [
    { items: [
      { path: '/app/dashboard', label: 'Dashboard', icon: Home },
      { path: '/app/pacientes', label: 'Pacientes', icon: Users },
      { path: '/app/agenda', label: 'Agenda', icon: Calendar },
      { path: '/app/tratamientos', label: 'Tratamientos', icon: Stethoscope },
    ]},
    { label: 'TMS', items: [
      { path: '/app/tms', label: 'Módulo TMS', icon: Brain },
      { path: '/app/tms/brain', label: 'Brain Viewer', icon: Activity },
      { path: '/app/tms/sesion', label: 'Sesión TMS', icon: Zap },
      { path: '/app/tms/simulador', label: 'Simulador', icon: LineChart },
    ]},
    { items: [
      { path: '/app/evaluaciones', label: 'Evaluaciones', icon: Activity },
    ]},
    { label: 'Visual Engine', items: [
      { path: '/app/visual/tms', label: 'Monitor TMS', icon: Monitor },
    ]},
  ],
  reception: [
    { items: [
      { path: '/app/dashboard', label: 'Dashboard', icon: Home },
      { path: '/app/pacientes', label: 'Pacientes', icon: Users },
      { path: '/app/agenda', label: 'Agenda', icon: Calendar },
    ]},
  ],
  patient: [
    { items: [
      { path: '/app/dashboard', label: 'Mi Dashboard', icon: Home },
      { path: '/app/citas', label: 'Mis Citas', icon: Calendar },
    ]},
  ],
};

export default function Sidebar({ collapsed, mobileOpen, onToggle, isMobile }: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role || 'patient';
  const sections = navByRole[role] || navByRole.patient;

  const showSidebar = isMobile ? mobileOpen : true;
  const sidebarWidth = isMobile ? 'w-64' : collapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 text-white transition-all duration-300 z-40 flex flex-col border-r border-slate-700/20 ${sidebarWidth} ${
        isMobile && !mobileOpen ? '-translate-x-full' : 'translate-x-0'
      }`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-slate-700/30`}>
        {!collapsed && (
          <Link to="/app/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Neurociencia</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && !collapsed && (
              <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-400 shadow-[inset_3px_0_0_0_theme(colors.teal.400)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {!isMobile && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center h-12 border-t border-slate-700/50 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      )}
    </aside>
  );
}
