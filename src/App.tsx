import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const TMS = lazy(() => import('./pages/TMS'));
const Experience = lazy(() => import('./pages/Experience'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const Blog = lazy(() => import('./pages/Blog'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Chat = lazy(() => import('./pages/Chat'));
const DashboardRouter = lazy(() => import('./pages/DashboardRouter'));
const ReceptionDashboard = lazy(() => import('./pages/app/ReceptionDashboard'));
const TherapistDashboard = lazy(() => import('./pages/app/TherapistDashboard'));
const PatientsPage = lazy(() => import('./pages/app/PatientsPage'));
const PatientDetailPage = lazy(() => import('./pages/app/PatientDetailPage'));
const AgendaPage = lazy(() => import('./pages/app/AgendaPage'));
const TreatmentsPage = lazy(() => import('./pages/app/TreatmentsPage'));
const TmsModulePage = lazy(() => import('./pages/app/TmsModulePage'));
const BrainViewerPage = lazy(() => import('./pages/app/BrainViewerPage'));
const TMSSessionPage = lazy(() => import('./pages/app/TMSSessionPage'));
const DigitalTwinPage = lazy(() => import('./pages/app/DigitalTwinPage'));
const SimulatorPage = lazy(() => import('./pages/app/SimulatorPage'));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'));
const VisualBrainPage = lazy(() => import('./pages/visual/VisualBrainPage'));
const VisualTMSPage = lazy(() => import('./pages/visual/VisualTMSPage'));
const VisualTwinPage = lazy(() => import('./pages/visual/VisualTwinPage'));
const VisualHospitalPage = lazy(() => import('./pages/visual/VisualHospitalPage'));
const VisualKioskPage = lazy(() => import('./pages/visual/VisualKioskPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<><Header /><main className="flex-grow"><Home /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/nosotros" element={<><Header /><main className="flex-grow"><About /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/servicios" element={<><Header /><main className="flex-grow"><Services /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/emt-tms" element={<><Header /><main className="flex-grow"><TMS /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/proceso" element={<><Header /><main className="flex-grow"><Experience /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/testimonios" element={<><Header /><main className="flex-grow"><Testimonials /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/blog" element={<><Header /><main className="flex-grow"><Blog /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/faq" element={<><Header /><main className="flex-grow"><FAQ /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/contacto" element={<><Header /><main className="flex-grow"><Contact /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/chat" element={<><Header /><main className="flex-grow"><Chat /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/privacidad" element={<><Header /><main className="flex-grow"><Privacy /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/terminos" element={<><Header /><main className="flex-grow"><Terms /></main><Footer /><WhatsAppButton /></>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/brain" element={<BrainViewerPage />} />

              {/* Protected app routes with AppLayout */}
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<DashboardRouter />} />
                <Route path="dashboard" element={<DashboardRouter />} />
                <Route path="recepcion" element={<ReceptionDashboard />} />
                <Route path="terapeuta" element={<TherapistDashboard />} />
                <Route path="pacientes" element={<PatientsPage />} />
                <Route path="pacientes/:id" element={<PatientDetailPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="tratamientos" element={<TreatmentsPage />} />
                <Route path="tms" element={<TmsModulePage />} />
                <Route path="tms/brain" element={<BrainViewerPage />} />
                <Route path="tms/sesion" element={<TMSSessionPage />} />
                <Route path="tms/twin" element={<DigitalTwinPage />} />
                <Route path="tms/simulador" element={<SimulatorPage />} />
                <Route path="reportes" element={<ReportsPage />} />
                <Route path="configuracion" element={<SettingsPage />} />
                <Route path="citas" element={<AgendaPage />} />
                <Route path="visual/brain/:id" element={<VisualBrainPage />} />
                <Route path="visual/tms" element={<VisualTMSPage />} />
                <Route path="visual/twin/:id" element={<VisualTwinPage />} />
                <Route path="visual/hospital" element={<VisualHospitalPage />} />
                <Route path="visual/kiosk" element={<VisualKioskPage />} />
              </Route>

              {/* Legacy redirect */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/calendar" element={<Navigate to="/app/agenda" replace />} />
              <Route path="/citas" element={<Navigate to="/app/agenda" replace />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
