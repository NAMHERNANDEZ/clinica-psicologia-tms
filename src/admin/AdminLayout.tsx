import { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Brain, Users, LayoutDashboard, LogOut, Menu, X, Phone, Megaphone, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/leads', label: 'Leads', icon: Users, end: false },
  { to: '/admin/marketing', label: 'Marketing AI', icon: Megaphone, end: false },
  { to: '/admin/chat', label: 'Chat IA', icon: MessageCircle, end: false },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = (
    <nav className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-teal-500/20 text-teal-300'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden text-slate-300 p-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menú"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Neurociencia Clínica</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Panel Admin</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-sm text-slate-400">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:block px-4 pb-3">{navLinks}</div>
      </header>

      {/* Mobile drawer nav */}
      {isMobile && menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 z-50 p-4 md:hidden">
            <div className="flex items-center justify-between mb-6">
              <p className="text-white font-semibold">Administración</p>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navLinks}
          </div>
        </>
      )}

      {/* Content */}
      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
