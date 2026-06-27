import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Search, X, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { alerts } from '../lib/api';

export default function TopBar({ sidebarCollapsed, onMenuClick, isMobile }: {
  sidebarCollapsed: boolean;
  onMenuClick?: () => void;
  isMobile?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationList, setNotificationList] = useState<Array<{ id: number; title: string; message: string; severity: string; created_at: string }>>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAlerts = async () => {
    try {
      const summary = await alerts.getSummary();
      setUnreadCount(summary.data?.unread || 0);
    } catch { /* silent */ }
  };

  const loadNotifications = async () => {
    try {
      const res = await alerts.list();
      setNotificationList(res.data || []);
      await alerts.markAllRead();
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    therapist: 'Terapeuta',
    reception: 'Recepción',
    patient: 'Paciente',
  };

  return (
    <header className="fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300"
      style={{ left: isMobile ? 0 : sidebarCollapsed ? '4rem' : '15rem' }}
    >
      <div className="flex items-center space-x-4">
        {isMobile && (
          <button onClick={onMenuClick} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            className="pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) loadNotifications(); }}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">Notificaciones</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notificationList.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Sin notificaciones</div>
                ) : (
                  notificationList.slice(0, 10).map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 border-b border-slate-50">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-500">{roleLabels[user?.role || 'patient']}</p>
            </div>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                <p className="text-xs text-slate-500">{roleLabels[user?.role || 'patient']}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
