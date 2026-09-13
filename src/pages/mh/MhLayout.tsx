import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const items = [
  { to: '/mh', label: 'Hoy', end: true },
  { to: '/mh/checkin', label: 'Check-in', end: false },
  { to: '/mh/intervenciones', label: 'Intervenciones', end: false },
  { to: '/mh/insights', label: 'Insights', end: false },
  { to: '/mh/historial', label: 'Historial', end: false },
  { to: '/mh/privacidad', label: 'Privacidad', end: false },
];

export default function MhLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-50">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/mh" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="font-semibold text-slate-800">MyCalma</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/app/dashboard" className="text-slate-500 hover:text-teal-600">
              Panel clínico
            </Link>
            <button
              onClick={handleLogout}
              disabled={busy}
              className="text-slate-400 hover:text-rose-500 disabled:opacity-50"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto px-2 pb-2 flex gap-1 overflow-x-auto">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700'
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
          <span>MyCalma · Bienestar personal</span>
          <span>Esta herramienta no sustituye atención profesional.</span>
        </div>
      </footer>
    </div>
  );
}