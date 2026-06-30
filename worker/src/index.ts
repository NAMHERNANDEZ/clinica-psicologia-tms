import type { Env } from './types';
import { getCorsHeaders, isOriginAllowed } from './lib/cors';
import { checkRateLimit, rateLimitHeaders, getClientIP } from './lib/rate-limit';
import { authenticate } from './middleware/authenticate';
import { requireAuth } from './middleware/require-role';
import { handleRegister, handleLogin, handleRefresh, handleLogout, handleGetMe } from './domains/auth/routes';
import { handleListPatients, handleGetPatient, handleCreatePatient, handleUpdatePatient, handleDeletePatient } from './domains/patients/routes';
import { handleListTherapists, handleGetTherapist, handleCreateTherapist, handleUpdateTherapist, handleDeleteTherapist } from './domains/therapists/routes';
import { handleListAppointments, handleGetAppointment, handleCreateAppointment, handleUpdateAppointment, handleDeleteAppointment } from './domains/appointments/routes';
import { handleGetReminders, handleGenerateReminders } from './domains/reminders/routes';
import { handleLogNotification, handleGetNotifications } from './domains/notifications/routes';
import { handleGetTemplates, handleCreateTemplate, handleUpdateTemplate, handleDeleteTemplate } from './domains/templates/routes';
import { handleGetReceptionQueue, handleAddToQueue, handleUpdateQueueStatus } from './domains/reception/routes';
import { handleGetAlerts, handleGetAlertSummary, handleCreateAlert, handleMarkAlertRead, handleMarkAllRead, handleDeleteAlert } from './domains/alerts/routes';
import { handleGetTreatments, handleGetTreatment, handleCreateTreatment, handleUpdateTreatment, handleDeleteTreatment } from './domains/treatments/routes';
import { handleGetPatientNotes, handleGetClinicNotes, handleCreateNote, handleDeleteNote } from './domains/clinical-notes/routes';
import { handleGetPatientTimeline, handleGetClinicTimeline, handleCreateEvent } from './domains/timeline/routes';
import { handleGetSessions, handleCompleteSession, handleUpdateSession } from './domains/sessions/routes';
import { handleGetProtocols, handleGetProtocol, handleCreateProtocol, handleUpdateProtocol, handleDeactivateProtocol, handleSuggestProtocol } from './domains/tms-protocols/routes';
import { handleGetPatientMeasurements as handleGetMotorThresholds, handleGetClinicMeasurements, handleRecordMeasurement, handleDeleteMeasurement } from './domains/motor-thresholds/routes';
import { handleGetPatientProfiles, handleGetClinicProfiles, handleGetProfile, handleCreateProfile, handleActivateProfile, handleCompleteProfile, handleDiscontinueProfile } from './domains/tms-profiles/routes';
import { handleGetProfileSessions, handleCreateSession as handleCreateTmsSession, handleCompleteSession as handleCompleteTmsSession, handleUpdateSession as handleUpdateTmsSessionStatus } from './domains/tms-sessions/routes';
import { handleGetPatientResponses, handleGetSessionResponse, handleRecordResponse, handleGetProgressCurve } from './domains/clinical-response/routes';
import { handleGetPatientEffects, handleRecordEffect, handleResolveEffect, handleGetEffectStats } from './domains/adverse-effects/routes';
import { handleGetPatientDashboard, handleAnalyzeResponse, handleSuggestAdjustment, handleGetProtocolEfficiency, handleGetTmsDashboard, handleCreateAssessment, handleGetAssessmentsByPatient, handleGetAssessmentsByType } from './domains/tms-engine/routes';
import { handlePredictResponse, handleGetPatientPredictions, handleGetPredictionHistory, handleEvaluateConfidence } from './domains/digital-twin/routes';
import { handleSimulateProtocol, handleCompareProtocols, handleGetComparisonHistory, handleGetSimulationDashboard, handleGetBrainState } from './domains/simulation/routes';
import { handleGenerateReport, handleGetTreatmentSummary, handleExportCSV, handleGetReportHistory } from './domains/reports/routes';
import { handleGetPatientJourney, handleStartTreatment, handleCompleteSession as handleJourneyCompleteSession, handleGetReceptionView, handleGetTherapistView, handleDischargePatient } from './domains/patient-journey/routes';
import { handleCosToday, handleCosNextAction, handleCosPatientStates, handleCosTasks, handleCosAlerts } from './domains/cos/routes';
import { handleSetup } from './domains/setup/routes';
import { generateReminders } from './domains/reminders/service';
import { generateWhatsAppUrl, renderAppointmentReminder } from './lib/whatsapp';

function generateRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function json(data: unknown, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  const body = typeof data === 'object' && data !== null && 'success' in (data as Record<string, unknown>)
    ? { ...data as Record<string, unknown>, requestId }
    : { success: true, data, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function jsonError(error: string, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  return new Response(JSON.stringify({ success: false, error, requestId }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function withCors(fn: () => Promise<Response>, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const response = await fn();
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    response.headers.set('X-Request-Id', requestId);
    return response;
  } catch (err) {
    console.error(`[${requestId}] Handler error:`, err);
    return jsonError('Internal error', 500, corsHeaders, requestId);
  }
}

async function handleHealth(env: Env, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const start = Date.now();
    await env.DB.prepare('SELECT 1').first();
    const dbLatency = Date.now() - start;
    return json({ status: 'ok', db: 'connected', dbLatency, timestamp: Date.now() }, 200, corsHeaders, requestId);
  } catch (err) {
    console.error(`[${requestId}] Health check failed:`, err);
    return json({ status: 'degraded', db: 'disconnected', timestamp: Date.now() }, 503, corsHeaders, requestId);
  }
}

async function handleWhatsAppPreview(env: Env, request: Request, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { patient_name, phone, date, time, therapist_name, template } = body as {
      patient_name: string; phone: string; date: string; time: string;
      therapist_name: string; template?: string;
    };
    if (!patient_name || !phone || !date || !time || !therapist_name) {
      return jsonError('patient_name, phone, date, time, therapist_name requeridos', 400, corsHeaders, requestId);
    }
    const message = template
      ? template.replace('{nombre}', patient_name).replace('{fecha}', date).replace('{hora}', time).replace('{terapeuta}', therapist_name)
      : renderAppointmentReminder(patient_name, date, time, therapist_name);
    const url = generateWhatsAppUrl(phone, message);
    return json({ message, url, phone }, 200, corsHeaders, requestId);
  } catch (err) {
    console.error(`[${requestId}] WhatsApp preview error:`, err);
    return jsonError('Internal error', 500, corsHeaders, requestId);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = generateRequestId();
    const corsHeaders = getCorsHeaders(env, request.headers.get('Origin'));

    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (!isOriginAllowed(env, request.headers.get('Origin'))) {
        return jsonError('Origin not allowed', 403, corsHeaders, requestId);
      }

      const ip = getClientIP(request);
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      if (path === '/api/health' && method === 'GET') {
        return handleHealth(env, corsHeaders, requestId);
      }

      if (path === '/api/whatsapp/preview' && method === 'POST') {
        return withCors(() => handleWhatsAppPreview(env, request, corsHeaders, requestId), corsHeaders, requestId);
      }

      if (path === '/api/setup' && method === 'POST') {
        return withCors(() => handleSetup(env, request, corsHeaders, requestId), corsHeaders, requestId);
      }

      const { allowed, remaining } = await checkRateLimit(env, ip, path);
      if (!allowed) {
        return jsonError('Rate limit exceeded', 429, { ...corsHeaders, ...rateLimitHeaders(remaining) }, requestId);
      }

      if (path === '/api/auth/register' && method === 'POST') return withCors(() => handleRegister(env, request, corsHeaders), corsHeaders, requestId);
      if (path === '/api/auth/login' && method === 'POST') return withCors(() => handleLogin(env, request, corsHeaders), corsHeaders, requestId);
      if (path === '/api/auth/refresh' && method === 'POST') return withCors(() => handleRefresh(env, request, corsHeaders), corsHeaders, requestId);
      if (path === '/api/auth/logout' && method === 'POST') return withCors(() => handleLogout(env, request, corsHeaders), corsHeaders, requestId);
      if (path === '/api/auth/me' && method === 'GET') return withCors(() => handleGetMe(env, request, corsHeaders), corsHeaders, requestId);

      const user = await authenticate(env, request);
      const authError = requireAuth(user);
      if (authError) {
        Object.entries(corsHeaders).forEach(([k, v]) => authError.headers.set(k, v));
        authError.headers.set('X-Request-Id', requestId);
        return authError;
      }

      // PATIENTS
      if (path === '/api/patients' && method === 'GET') return withCors(() => handleListPatients(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/patients' && method === 'POST') return withCors(() => handleCreatePatient(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/patients\/\d+$/) && method === 'GET') return withCors(() => handleGetPatient(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/patients\/\d+$/) && method === 'PUT') return withCors(() => handleUpdatePatient(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/patients\/\d+$/) && method === 'DELETE') return withCors(() => handleDeletePatient(env, request, user!, corsHeaders), corsHeaders, requestId);

      // THERAPISTS
      if (path === '/api/therapists' && method === 'GET') return withCors(() => handleListTherapists(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/therapists' && method === 'POST') return withCors(() => handleCreateTherapist(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/therapists\/\d+$/) && method === 'GET') return withCors(() => handleGetTherapist(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/therapists\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTherapist(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/therapists\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteTherapist(env, request, user!, corsHeaders), corsHeaders, requestId);

      // APPOINTMENTS
      if (path === '/api/appointments' && method === 'GET') return withCors(() => handleListAppointments(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/appointments' && method === 'POST') return withCors(() => handleCreateAppointment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/appointments\/\d+$/) && method === 'GET') return withCors(() => handleGetAppointment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/appointments\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateAppointment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/appointments\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteAppointment(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 2: REMINDERS
      if (path === '/api/reminders' && method === 'GET') return withCors(() => handleGetReminders(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/reminders/generate' && method === 'POST') return withCors(() => handleGenerateReminders(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 2: NOTIFICATIONS
      if (path === '/api/notifications' && method === 'GET') return withCors(() => handleGetNotifications(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/notifications/log' && method === 'POST') return withCors(() => handleLogNotification(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 2: TEMPLATES
      if (path === '/api/templates' && method === 'GET') return withCors(() => handleGetTemplates(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/templates' && method === 'POST') return withCors(() => handleCreateTemplate(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/templates\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTemplate(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/templates\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteTemplate(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 2: RECEPTION
      if (path === '/api/reception/queue' && method === 'GET') return withCors(() => handleGetReceptionQueue(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/reception/queue' && method === 'POST') return withCors(() => handleAddToQueue(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/reception\/queue\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateQueueStatus(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 2: ALERTS
      if (path === '/api/alerts' && method === 'GET') return withCors(() => handleGetAlerts(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/alerts' && method === 'POST') return withCors(() => handleCreateAlert(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/alerts/summary' && method === 'GET') return withCors(() => handleGetAlertSummary(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/alerts/read-all' && method === 'PUT') return withCors(() => handleMarkAllRead(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/alerts\/\d+\/read$/) && method === 'PUT') return withCors(() => handleMarkAlertRead(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/alerts\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteAlert(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 3: TREATMENTS
      if (path === '/api/treatments' && method === 'GET') return withCors(() => handleGetTreatments(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/treatments' && method === 'POST') return withCors(() => handleCreateTreatment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/treatments\/\d+$/) && method === 'GET') return withCors(() => handleGetTreatment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/treatments\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTreatment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/treatments\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteTreatment(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 3: CLINICAL NOTES
      if (path === '/api/clinical-notes' && method === 'GET') return withCors(() => handleGetClinicNotes(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/clinical-notes' && method === 'POST') return withCors(() => handleCreateNote(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/clinical-notes\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientNotes(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/clinical-notes\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteNote(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 3: TIMELINE
      if (path === '/api/timeline' && method === 'GET') return withCors(() => handleGetClinicTimeline(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/timeline' && method === 'POST') return withCors(() => handleCreateEvent(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/timeline\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientTimeline(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 3: SESSIONS
      if (path === '/api/sessions/complete' && method === 'POST') return withCors(() => handleCompleteSession(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/sessions\/\d+$/) && method === 'GET') return withCors(() => handleGetSessions(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/sessions\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateSession(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: TMS ENGINE (dashboard, analisis, sugerencias)
      if (path === '/api/tms/engine/dashboard' && method === 'GET') return withCors(() => handleGetTmsDashboard(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/engine/efficiency' && method === 'GET') return withCors(() => handleGetProtocolEfficiency(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/engine\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientDashboard(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/engine\/analyze\/\d+$/) && method === 'GET') return withCors(() => handleAnalyzeResponse(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/engine\/adjust\/\d+$/) && method === 'GET') return withCors(() => handleSuggestAdjustment(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: CLINICAL ASSESSMENTS (escalas validadas)
      if (path === '/api/assessments' && method === 'POST') return withCors(() => handleCreateAssessment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/assessments\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetAssessmentsByPatient(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/assessments\/patient\/\d+\/\w+$/) && method === 'GET') return withCors(() => handleGetAssessmentsByType(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: TMS PROTOCOLS
      if (path === '/api/tms/protocols' && method === 'GET') return withCors(() => handleGetProtocols(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/protocols' && method === 'POST') return withCors(() => handleCreateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/protocols/suggest' && method === 'POST') return withCors(() => handleSuggestProtocol(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/protocols\/\d+$/) && method === 'GET') return withCors(() => handleGetProtocol(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/protocols\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/protocols\/\d+\/deactivate$/) && method === 'PUT') return withCors(() => handleDeactivateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: MOTOR THRESHOLDS
      if (path === '/api/tms/motor-thresholds' && method === 'GET') return withCors(() => handleGetClinicMeasurements(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/motor-thresholds' && method === 'POST') return withCors(() => handleRecordMeasurement(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/motor-thresholds\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetMotorThresholds(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/motor-thresholds\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteMeasurement(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: TMS PROFILES (asignacion de protocolo a paciente)
      if (path === '/api/tms/profiles' && method === 'GET') return withCors(() => handleGetClinicProfiles(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/profiles' && method === 'POST') return withCors(() => handleCreateProfile(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/profiles\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientProfiles(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/profiles\/\d+$/) && method === 'GET') return withCors(() => handleGetProfile(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/profiles\/\d+\/activate$/) && method === 'PUT') return withCors(() => handleActivateProfile(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/profiles\/\d+\/complete$/) && method === 'PUT') return withCors(() => handleCompleteProfile(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/profiles\/\d+\/discontinue$/) && method === 'PUT') return withCors(() => handleDiscontinueProfile(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: TMS SESSIONS
      if (path === '/api/tms/sessions' && method === 'POST') return withCors(() => handleCreateTmsSession(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/sessions/complete' && method === 'POST') return withCors(() => handleCompleteTmsSession(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/sessions\/\d+$/) && method === 'GET') return withCors(() => handleGetProfileSessions(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/sessions\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTmsSessionStatus(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: CLINICAL RESPONSE TRACKING
      if (path === '/api/tms/clinical-response' && method === 'POST') return withCors(() => handleRecordResponse(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/clinical-response\/patient\/\d+\/curve$/) && method === 'GET') return withCors(() => handleGetProgressCurve(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/clinical-response\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientResponses(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/clinical-response\/session\/\d+$/) && method === 'GET') return withCors(() => handleGetSessionResponse(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 5: ADVERSE EFFECTS
      if (path === '/api/tms/adverse-effects' && method === 'POST') return withCors(() => handleRecordEffect(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/adverse-effects/stats' && method === 'GET') return withCors(() => handleGetEffectStats(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/adverse-effects\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientEffects(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/adverse-effects\/\d+\/resolve$/) && method === 'PUT') return withCors(() => handleResolveEffect(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 7: DIGITAL TWIN
      if (path === '/api/tms/digital-twin/predict' && method === 'POST') return withCors(() => handlePredictResponse(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/digital-twin\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientPredictions(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/digital-twin\/history\/\d+$/) && method === 'GET') return withCors(() => handleGetPredictionHistory(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/digital-twin\/confidence\/\d+$/) && method === 'GET') return withCors(() => handleEvaluateConfidence(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 7: SIMULATION
      if (path === '/api/tms/simulation/simulate' && method === 'POST') return withCors(() => handleSimulateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/simulation/compare' && method === 'POST') return withCors(() => handleCompareProtocols(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/simulation\/history\/\d+$/) && method === 'GET') return withCors(() => handleGetComparisonHistory(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/tms/simulation/dashboard' && method === 'GET') return withCors(() => handleGetSimulationDashboard(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/simulation\/brain\/\d+$/) && method === 'GET') return withCors(() => handleGetBrainState(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 7: REPORTS
      if (path === '/api/tms/reports/generate' && method === 'POST') return withCors(() => handleGenerateReport(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/reports\/treatment\/\d+$/) && method === 'GET') return withCors(() => handleGetTreatmentSummary(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/reports\/export\/\d+$/) && method === 'GET') return withCors(() => handleExportCSV(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/tms\/reports\/history\/\d+$/) && method === 'GET') return withCors(() => handleGetReportHistory(env, request, user!, corsHeaders), corsHeaders, requestId);

      // FASE 8: PATIENT JOURNEY (integration)
      if (path === '/api/journey/reception' && method === 'GET') return withCors(() => handleGetReceptionView(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/journey/therapist' && method === 'GET') return withCors(() => handleGetTherapistView(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/journey/start-treatment' && method === 'POST') return withCors(() => handleStartTreatment(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path === '/api/journey/complete-session' && method === 'POST') return withCors(() => handleJourneyCompleteSession(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/journey\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientJourney(env, request, user!, corsHeaders), corsHeaders, requestId);
      if (path.match(/^\/api\/journey\/discharge\/\d+$/) && method === 'POST') return withCors(() => handleDischargePatient(env, request, user!, corsHeaders), corsHeaders, requestId);

      // COS-L: CLINICAL OPERATING SYSTEM LAYER
      if (path === '/api/cos/today' && method === 'GET') return withCors(() => handleCosToday(env, request, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/next-action' && method === 'GET') return withCors(() => handleCosNextAction(env, request, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/patient-states' && method === 'GET') return withCors(() => handleCosPatientStates(env, request, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/tasks' && method === 'GET') return withCors(() => handleCosTasks(env, request, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/alerts' && method === 'GET') return withCors(() => handleCosAlerts(env, request, corsHeaders, requestId), corsHeaders, requestId);

      return jsonError('Not found', 404, corsHeaders, requestId);
    } catch (err) {
      console.error(`[${requestId}] Worker error:`, err);
      return jsonError('Internal error', 500, corsHeaders, requestId);
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const requestId = generateRequestId();
    console.log(`[${requestId}] Cron job started — generating reminders`);
    try {
      await generateReminders(env, 1);
      console.log(`[${requestId}] Cron job completed`);
    } catch (err) {
      console.error(`[${requestId}] Cron job failed:`, err);
    }
  },
};
