import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  const isFullscreen = location.pathname.includes('/tms/brain');

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-[#080C12]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => {
          if (isMobile) {
            setMobileOpen(!mobileOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        isMobile={isMobile}
      />
      <TopBar
        sidebarCollapsed={isMobile ? false : sidebarCollapsed}
        onMenuClick={() => setMobileOpen(!mobileOpen)}
        isMobile={isMobile}
      />
      <main
        className="pt-16 transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarCollapsed ? '4rem' : '15rem' }}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
