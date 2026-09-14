import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import PatientAIChat from './components/PatientAIChat';
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
const PatientChartPage = lazy(() => import('./pages/app/PatientChartPage'));
const AgendaPage = lazy(() => import('./pages/app/AgendaPage'));
const TreatmentsPage = lazy(() => import('./pages/app/TreatmentsPage'));
const TmsModulePage = lazy(() => import('./pages/app/TmsModulePage'));
const BrainViewerPage = lazy(() => import('./pages/app/BrainViewerPage'));
const TMSSessionPage = lazy(() => import('./pages/app/TMSSessionPage'));
const DigitalTwinPage = lazy(() => import('./pages/app/DigitalTwinPage'));
const SimulatorPage = lazy(() => import('./pages/app/SimulatorPage'));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'));
const ClinicalAssessmentsPage = lazy(() => import('./pages/app/ClinicalAssessmentsPage'));
const VisualBrainPage = lazy(() => import('./pages/visual/VisualBrainPage'));
const VisualTMSPage = lazy(() => import('./pages/visual/VisualTMSPage'));
const VisualTwinPage = lazy(() => import('./pages/visual/VisualTwinPage'));
const VisualHospitalPage = lazy(() => import('./pages/visual/VisualHospitalPage'));
const VisualKioskPage = lazy(() => import('./pages/visual/VisualKioskPage'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLeadsPage = lazy(() => import('./pages/admin/LeadsPage'));
const AdminMarketingPage = lazy(() => import('./pages/admin/MarketingPage'));
const AdminChatPage = lazy(() => import('./pages/admin/ChatPage'));
const MhLayout = lazy(() => import('./pages/mh/MhLayout'));
const MhHomePage = lazy(() => import('./pages/mh/MhHomePage'));
const MhCheckinPage = lazy(() => import('./pages/mh/MhCheckinPage'));
const MhInterventionsPage = lazy(() => import('./pages/mh/MhInterventionsPage'));
const MhInterventionDetailPage = lazy(() => import('./pages/mh/MhInterventionDetailPage'));
const MhInsightsPage = lazy(() => import('./pages/mh/MhInsightsPage'));
const MhHistoryPage = lazy(() => import('./pages/mh/MhHistoryPage'));
const MhPrivacyPage = lazy(() => import('./pages/mh/MhPrivacyPage'));
const MhAssessmentsPage = lazy(() => import('./pages/mh/MhAssessmentsPage'));
const MhAssessmentRunPage = lazy(() => import('./pages/mh/MhAssessmentRunPage'));
const MhCbtPage = lazy(() => import('./pages/mh/MhCbtPage'));
const MhCbtSessionPage = lazy(() => import('./pages/mh/MhCbtSessionPage'));

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Widget "Pregúntale a nuestra IA" solo en páginas públicas del sitio
// (nunca en el área clínica /app, /admin ni en login/registro).
function PublicAIChat() {
  const { pathname } = useLocation();
  if (
    pathname.startsWith('/app') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/mh') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  ) {
    return null;
  }
  return <PatientAIChat />;
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
                <Route path="expediente/:patientId" element={<PatientChartPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="tratamientos" element={<TreatmentsPage />} />
                <Route path="tms" element={<TmsModulePage />} />
                <Route path="tms/brain" element={<BrainViewerPage />} />
                <Route path="tms/sesion" element={<TMSSessionPage />} />
                <Route path="tms/twin" element={<DigitalTwinPage />} />
                <Route path="tms/simulador" element={<SimulatorPage />} />
                <Route path="reportes" element={<ReportsPage />} />
                <Route path="evaluaciones" element={<ClinicalAssessmentsPage />} />
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

              {/* Admin private area (FASE 11.2) */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="leads" element={<AdminLeadsPage />} />
                <Route path="marketing" element={<AdminMarketingPage />} />
                <Route path="chat" element={<AdminChatPage />} />
              </Route>

              {/* Mental Health (bienestar personal) — area mobile-first, user-scoped */}
              <Route path="/mh" element={<ProtectedRoute><MhLayout /></ProtectedRoute>}>
                <Route index element={<MhHomePage />} />
                <Route path="checkin" element={<MhCheckinPage />} />
                <Route path="cbt" element={<MhCbtPage />} />
                <Route path="cbt/:id" element={<MhCbtSessionPage />} />
                <Route path="intervenciones" element={<MhInterventionsPage />} />
                <Route path="intervenciones/:slug" element={<MhInterventionDetailPage />} />
                <Route path="insights" element={<MhInsightsPage />} />
                <Route path="historial" element={<MhHistoryPage />} />
                <Route path="privacidad" element={<MhPrivacyPage />} />
                <Route path="assessments" element={<MhAssessmentsPage />} />
                <Route path="assessments/:scaleId" element={<MhAssessmentRunPage />} />
              </Route>
            </Routes>
          </Suspense>
          </ErrorBoundary>
          <PublicAIChat />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
