import type { Env } from './types';
import { handleHealth } from './health/routes';
import { getCorsHeaders, isOriginAllowed } from './lib/cors';
import { checkRateLimit, rateLimitHeaders, getClientIP } from './lib/rate-limit';
import { handleVoiceChat, handleTTS, handleCheckAvailability, handleCreateAppointment as handleVoiceCreateAppointment } from './domains/voice/routes';
import { sttRouter } from './routes/voice-provider-router';
import { createOAuthState, consumeOAuthState, getAuthUrl, exchangeCode, storeCalendarAuth } from './lib/calendar-oauth';
import { authenticate } from './middleware/authenticate';
import { requireAuth, requireRole } from './middleware/require-role';
import { handleRegister, handleLogin, handleRefresh, handleLogout, handleGetMe } from './domains/auth/routes';
import { handleListPatients, handleGetPatient, handleCreatePatient, handleUpdatePatient, handleDeletePatient } from './domains/patients/routes';
import { handleListTherapists, handleGetTherapist, handleCreateTherapist, handleUpdateTherapist, handleDeleteTherapist } from './domains/therapists/routes';
import { handleListAppointments, handleGetAppointment, handleCreateAppointment, handleUpdateAppointment, handleDeleteAppointment } from './domains/appointments/routes';
import { handleListFollowups, handleGetFollowup, handleCreateFollowup, handleUpdateFollowup, handleCompleteFollowup, handleDeleteFollowup } from './domains/followups/routes';
import { handleGetReminders, handleGenerateReminders } from './domains/reminders/routes';
import { handleLogNotification, handleGetNotifications } from './domains/notifications/routes';
import { handleGetTemplates, handleCreateTemplate, handleUpdateTemplate, handleDeleteTemplate } from './domains/templates/routes';
import { handleGetReceptionQueue, handleAddToQueue, handleUpdateQueueStatus } from './domains/reception/routes';
import { handleGetAlerts, handleGetAlertSummary, handleCreateAlert, handleMarkAlertRead, handleMarkAllRead, handleDeleteAlert } from './domains/alerts/routes';
import { handleAutomationEvent } from './domains/automation/routes';
import { handleDashboardOverview } from './domains/dashboard/routes';
import { handleGetTreatments, handleGetTreatment, handleCreateTreatment, handleUpdateTreatment, handleDeleteTreatment } from './domains/treatments/routes';
import { handleGetPatientNotes, handleGetClinicNotes, handleCreateNote, handleUpdateNote, handleLockNote, handleUnlockNote, handleSignNote, handleCosignNote, handleGetNoteVersions, handleGetNoteAudit, handleGetNoteTemplates, handleDeleteNote } from './domains/clinical-notes/routes';
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
import { handleListRecords, handleGetRecord, handleCreateRecord, handleUpdateRecord, handleDeleteRecord } from './domains/clinical-records/routes';
import { handleListNotes, handleGetNote, handleCreateNote as handleCreateSessionNote, handleUpdateNote as handleUpdateSessionNote, handleDeleteNote as handleDeleteSessionNote } from './domains/session-notes/routes';
import { handleListConsents, handleGetConsent, handleCreateConsent, handleRevokeConsent, handleSignConsent, handleGetSignatures, handleGetVersions, handleListTemplates, handleCreateTemplate as handleCreateConsentTemplate, handleUpdateTemplate as handleUpdateConsentTemplate } from './domains/consents/routes';
import { handleListIncidents, handleGetIncident, handleCreateIncident, handleResolveIncident, handleDeleteIncident } from './domains/security-incidents/routes';
import { handleListDocuments, handleGetDocument, handleCreateDocument, handleSignDocument, handleArchiveDocument, handleSupersedeDocument, handleDownloadDocument } from './domains/documents/routes';
import { handleRunBackup, handleGetLatestBackup, handleListBackups, handleRestoreFromBackup, handleRestoreFromLatest, handleRestoreByDate, handleVerifyBackup, handleFireDrill, handleListRestores } from './domains/backups/routes';
import { handleSecurityEvents, handleSecurityDashboard, handleBlockIP, handleUnblockIP, handleBlockedIPs, handleUserSessions, handleRevokeSession, handleRevokeAllSessions, handleTrustDevice, handleRotateSecret, handleDocumentIntegrity, handleVerifyDocument, handleScanDocument } from './domains/security/routes';
import { handleObservabilityDashboard, handleObservabilityEvents, handleObservabilityMetrics, handleObservabilityHealthHistory, handleObservabilityAlerts, handleObservabilityExport } from './domains/observability/routes';
import { handlePerformanceDashboard, handleSlowQueries, handleQueryProfiles, handleCacheStats, handleWorkerPerformance, handleAnomalies } from './domains/performance/routes';
import { handleCronDashboard, handleCronJobs, handleCronJobDetail, handleRunCronJob, handleCronExecutions, handleCronFailures, handleResolveCronFailure } from './domains/cron-manager/routes';
import { handleListMetrics, handleGetMetric, handleCreateMetric, handleDeleteMetric, handleGetSummary, handleGetDashboard } from './domains/quality-metrics/routes';
import { INDEX_HTML, STATIC_ASSETS } from './frontend-assets';
import { handleComplianceDashboard, handleComplianceAlerts, handleComplianceRun, handleComplianceReportJson, handleComplianceReportCsv } from './routes/compliance';
import { generateReminders } from './domains/reminders/service';
import { generateWhatsAppUrl, renderAppointmentReminder } from './lib/whatsapp';
import { executeAllRules } from './compliance/engine/rule-executor';
import { ComplianceRepository } from './compliance/repository/compliance-repository';
import { logComplianceEvent } from './compliance/audit';
import { handleChat } from './domains/secretary/routes';
import { handleListLeads, handleGetLead, handleCreateLead, handleUpdateLead, handleUpdateLeadEstado, handleDeleteLead, handleAddLeadNote, handleGetLeadStats } from './domains/leads/routes';
import { handleMarketingOverview, handleMarketingContentGenerate, handleMarketingCampaignGenerate, handleMarketingSeoGenerate, handleMarketingContentList, handleMarketingContentStatus } from './domains/marketing/routes';
import { handleClinicalChatMessage, handleClinicalChatSessions, handleClinicalChatSessionMessages, handleClinicalChatStats } from './domains/clinical-chat/routes';
import { handleGetScales, handleGetCutoffs, handleGetAssessmentById, handlePreviewScore, handleCreateAssessment as handleCreateScaleAssessment, handleGetAssessmentsByPatient as handleGetScaleAssessmentsByPatient, handleGetAssessmentsByType as handleGetScaleAssessmentsByType, handleGetWellbeingScales, handleGetWellbeingCutoffs, handleCreateWellbeingAssessment, handleListWellbeingAssessments, handleGetWellbeingAssessmentById, handleWellbeingPreviewScore } from './domains/assessments/routes';
import {
  handleMhHome,
  handleMhCreateCheckin,
  handleMhListCheckins,
  handleMhTrendCheckins,
  handleMhListInterventions,
  handleMhGetIntervention,
  handleMhCreateSession,
  handleMhListSessions,
  handleMhListInsights,
  handleMhDismissInsight,
  handleMhListConsents,
  handleMhUpsertConsent,
  handleMhExport,
  handleMhDeleteAccount,
  handleMhListJournal,
  handleMhCreateJournal,
} from './domains/mental-health/routes';

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

import { ObservabilityService } from './domains/observability/service';

async function withCors(fn: () => Promise<Response>, corsHeaders: Record<string, string>, requestId: string, env?: Env, request?: Request, user?: any): Promise<Response> {
  const t0 = Date.now();
  const url = request ? new URL(request.url) : { pathname: 'unknown' } as URL;
  const endpoint = url.pathname;
  const method = request?.method || 'UNKNOWN';
  const userId = user?.id || (request?.headers.get("X-User-Id") ? parseInt(request.headers.get("X-User-Id")!) : undefined);
  const clinicId = user?.clinic_id || (request?.headers.get("X-Clinic-Id") ? parseInt(request.headers.get("X-Clinic-Id")!) : undefined);

  let response: Response;
  try {
    response = await fn();
  } catch (err) {
    console.error(`[${requestId}] Handler error:`, err);
    response = jsonError('Internal error', 500, corsHeaders, requestId);
  }

  const durationMs = Date.now() - t0;
  const statusCode = response.status;
  const level = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARNING" : "INFO";
  const category = endpoint.startsWith("/api/compliance") ? "compliance" : endpoint.startsWith("/api/health") ? "health" : endpoint.startsWith("/api/backups") ? "backup" : endpoint.startsWith("/api/auth") ? "auth" : "api";

  if (env) {
    const obsService = new ObservabilityService(env);
    await obsService.recordEvent({
      timestamp: new Date().toISOString(),
      level,
      category,
      service: "worker",
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: durationMs,
      request_id: requestId,
      user_id: userId,
      clinic_id: clinicId,
      metadata: { user_agent: request?.headers.get("User-Agent") },
    });
  }

  if (durationMs >= 500) {
    console.log(`[${requestId}] SLOW_REQUEST ${durationMs}ms`);
  }
  Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
  response.headers.set('X-Request-Id', requestId);
  return response;
}

function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  };
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
    const corsHeaders = { ...getCorsHeaders(env, request.headers.get('Origin')), ...securityHeaders() };

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

      // Rate limit GLOBAL temprano (antes de cualquier ruta pública, incluida
      // voz, chat, leads y calendario) para proteger cuota de proveedores LLM.
      const { allowed, remaining } = await checkRateLimit(env, ip, path);
      if (!allowed) {
        return jsonError('Rate limit exceeded', 429, { ...corsHeaders, ...rateLimitHeaders(remaining) }, requestId);
      }

      if (path === '/api/health' && method === 'GET') {
        return withCors(() => handleHealth(env, corsHeaders, requestId), corsHeaders, requestId, env, request)
      }

      // Voice TMS (sin autenticación; módulo público de pre-reserva)
      if (path === '/api/voice/chat' && method === 'POST') {
        return withCors(() => handleVoiceChat(env, request, corsHeaders), corsHeaders, requestId, env, request);
      }
      if (path === '/api/voice/tts' && method === 'POST') {
        return withCors(() => handleTTS(env, request, corsHeaders), corsHeaders, requestId, env, request);
      }
      if (path === '/api/voice/availability' && method === 'GET') {
        return withCors(() => handleCheckAvailability(env, request, corsHeaders), corsHeaders, requestId, env, request);
      }
      if (path === '/api/voice/appointments' && method === 'POST') {
        return withCors(() => handleVoiceCreateAppointment(env, request, corsHeaders), corsHeaders, requestId, env, request);
      }

      // STT (transcripción de audio del paciente)
      if (path === '/api/chat/stt' && method === 'POST') {
        return withCors(async () => {
          try {
            const form = await request.formData();
            const audio = form.get('audio');
            if (audio === null || typeof audio === 'string' || typeof (audio as any)?.arrayBuffer !== 'function') {
              return jsonError('audio (multipart/form-data) requerido', 400, corsHeaders, requestId);
            }
            const mimeType = form.get('mimeType')?.toString() || 'audio/wav';
            const language = form.get('language')?.toString() || 'es';
            const buf = await (audio as any).arrayBuffer();
            const stt = await sttRouter(env, buf, language, mimeType);
            if (stt.error) {
              return json({ transcript: '', provider: stt.provider, fallbackUsed: stt.fallbackUsed, error: stt.error }, 500, corsHeaders, requestId);
            }
            return json({ transcript: stt.result ?? '', provider: stt.provider, fallbackUsed: stt.fallbackUsed }, 200, corsHeaders, requestId);
          } catch (err) {
            console.error(`[${requestId}] /api/chat/stt error:`, err);
            return jsonError('Error al transcribir audio', 500, corsHeaders, requestId);
          }
        }, corsHeaders, requestId, env, request);
      }

      // Google Calendar OAuth — inicio (sesión admin/terapeuta)
      if (path === '/api/calendar/auth' && method === 'GET') {
        return withCors(async () => {
          const cuser = await authenticate(env, request);
          const cAuthError = requireAuth(cuser);
          if (cAuthError) return cAuthError;
          if (cuser!.role !== 'admin' && cuser!.role !== 'therapist') {
            return jsonError('Sin permisos para conectar calendario', 403, corsHeaders, requestId);
          }
          const nonce = await createOAuthState(env);
          const state = `clinic-${cuser!.clinic_id}-${nonce}`;
          const authUrl = getAuthUrl(env, cuser!.clinic_id, state);
          if (!authUrl) return jsonError('GOOGLE_CLIENT_ID no configurado', 500, corsHeaders, requestId);
          return Response.redirect(authUrl, 302);
        }, corsHeaders, requestId, env, request);
      }

      // Google Calendar OAuth — callback (sin cookie; valida state nonce)
      if (path === '/api/calendar/callback' && method === 'GET') {
        const cUrl = new URL(request.url);
        const code = cUrl.searchParams.get('code') || '';
        const state = cUrl.searchParams.get('state') || '';
        const m = state.match(/^clinic-(\d+)-([0-9a-f]{32})$/);
        if (!code || !m) {
          return new Response(JSON.stringify({ success: false, error: 'state/code inválidos' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
        const clinicId = parseInt(m[1], 10);
        const stateValid = await consumeOAuthState(env, m[2]);
        if (!stateValid) {
          return new Response(JSON.stringify({ success: false, error: 'state no válido o expirado' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
        const tokens = await exchangeCode(env, code);
        if (tokens.error || !tokens.access_token) {
          console.error(`[${requestId}] calendar exchange error:`, tokens.error || 'sin access_token');
          return new Response(JSON.stringify({ success: false, error: 'Error al intercambiar código OAuth' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
        await storeCalendarAuth(env, clinicId, tokens);
        const frontUrl = new URL(request.url);
        frontUrl.pathname = '/admin';
        frontUrl.search = '?calendar=connected';
        return Response.redirect(frontUrl.toString(), 302);
      }

      // Public chat assistant - no authentication required (patient acquisition)
      if (path === '/api/chat' && method === 'POST') {
        return withCors(() => handleChat(env, request, corsHeaders, requestId), corsHeaders, requestId, env, request);
      }

      // FASE 11.8: CLINICAL CHAT AI - public message endpoint (no auth)
      if (path === '/api/clinical-chat/message' && method === 'POST') {
        return withCors(() => handleClinicalChatMessage(env, request, corsHeaders), corsHeaders, requestId, env, request);
      }

      // Public lead creation - patient submits data via chat/form (no authentication)
      if (path === '/api/leads' && method === 'POST') {
        return withCors(() => handleCreateLead(env, request, corsHeaders, null), corsHeaders, requestId, env, request);
      }

      if (path === '/api/auth/register' && method === 'POST') return withCors(() => handleRegister(env, request, corsHeaders), corsHeaders, requestId, env, request);
      if (path === '/api/auth/login' && method === 'POST') return withCors(() => handleLogin(env, request, corsHeaders), corsHeaders, requestId, env, request);
      if (path === '/api/auth/refresh' && method === 'POST') return withCors(() => handleRefresh(env, request, corsHeaders), corsHeaders, requestId, env, request);
      if (path === '/api/auth/logout' && method === 'POST') return withCors(() => handleLogout(env, request, corsHeaders), corsHeaders, requestId, env, request);
      if (path === '/api/auth/me' && method === 'GET') return withCors(() => handleGetMe(env, request, corsHeaders), corsHeaders, requestId, env, request);

      // Leads (authenticated admin only) - RBAC: requireRole(admin)
      // (declared after `const user` below)

      // SPA fallback - serve frontend for non-API routes
      if (!path.startsWith('/api/')) {
        const asset = STATIC_ASSETS.find(a => a.path === path);
        if (asset) {
          const body = asset.isBase64
            ? Uint8Array.from(atob(asset.content), c => c.charCodeAt(0))
            : asset.content;
          return new Response(body, {
            status: 200,
            headers: { 'Content-Type': asset.contentType, ...corsHeaders },
          });
        }
        // SPA: serve index.html for all other routes
        return new Response(INDEX_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', ...corsHeaders },
        });
      }

      const user = await authenticate(env, request);
      const authError = requireAuth(user);
      if (authError) {
        Object.entries(corsHeaders).forEach(([k, v]) => authError.headers.set(k, v));
        authError.headers.set('X-Request-Id', requestId);
        return authError;
      }

      // Leads (authenticated admin only) - RBAC: requireRole(admin)
      const isLeadRoute = path === '/api/leads' && method === 'GET'
        || path === '/api/leads/stats' && method === 'GET'
        || path.match(/^\/api\/leads\/\d+$/) && (method === 'GET' || method === 'PATCH' || method === 'DELETE')
        || path.match(/^\/api\/leads\/\d+\/(estado|notes)$/) && method.match(/^(PUT|POST)$/);
      if (isLeadRoute) {
        const leadAuth = requireRole(user!, 'admin');
        if (leadAuth) {
          Object.entries(corsHeaders).forEach(([k, v]) => leadAuth.headers.set(k, v));
          leadAuth.headers.set('X-Request-Id', requestId);
          return leadAuth;
        }
      }
      if (path === '/api/leads' && method === 'GET') return withCors(() => handleListLeads(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/leads/stats' && method === 'GET') return withCors(() => handleGetLeadStats(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/leads\/\d+$/) && method === 'GET') return withCors(() => handleGetLead(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/leads\/\d+$/) && method === 'PATCH') return withCors(() => handleUpdateLead(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/leads\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteLead(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/leads\/\d+\/estado$/) && method === 'PUT') return withCors(() => handleUpdateLeadEstado(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/leads\/\d+\/notes$/) && method === 'POST') return withCors(() => handleAddLeadNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      if (path === '/api/whatsapp/preview' && method === 'POST') {
        return withCors(() => handleWhatsAppPreview(env, request, corsHeaders, requestId), corsHeaders, requestId);
      }

      // PATIENTS
      if (path === '/api/patients' && method === 'GET') return withCors(() => handleListPatients(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/patients' && method === 'POST') return withCors(() => handleCreatePatient(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/patients\/\d+$/) && method === 'GET') return withCors(() => handleGetPatient(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/patients\/\d+$/) && method === 'PUT') return withCors(() => handleUpdatePatient(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/patients\/\d+$/) && method === 'DELETE') return withCors(() => handleDeletePatient(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // THERAPISTS
      if (path === '/api/therapists' && method === 'GET') return withCors(() => handleListTherapists(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/therapists' && method === 'POST') return withCors(() => handleCreateTherapist(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/therapists\/\d+$/) && method === 'GET') return withCors(() => handleGetTherapist(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/therapists\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTherapist(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/therapists\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteTherapist(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // APPOINTMENTS
      if (path === '/api/appointments' && method === 'GET') return withCors(() => handleListAppointments(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/appointments' && method === 'POST') return withCors(() => handleCreateAppointment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/appointments\/\d+$/) && method === 'GET') return withCors(() => handleGetAppointment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/appointments\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateAppointment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/appointments\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteAppointment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 12.6: FOLLOWUPS (seguimiento clinico)
      if (path === '/api/followups' && method === 'GET') return withCors(() => handleListFollowups(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/followups' && method === 'POST') return withCors(() => handleCreateFollowup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/followups\/\d+\/complete$/) && method === 'POST') return withCors(() => handleCompleteFollowup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/followups\/\d+$/) && method === 'GET') return withCors(() => handleGetFollowup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/followups\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateFollowup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/followups\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteFollowup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: REMINDERS
      if (path === '/api/reminders' && method === 'GET') return withCors(() => handleGetReminders(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/reminders/generate' && method === 'POST') return withCors(() => handleGenerateReminders(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: NOTIFICATIONS
      if (path === '/api/notifications' && method === 'GET') return withCors(() => handleGetNotifications(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/notifications/log' && method === 'POST') return withCors(() => handleLogNotification(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: TEMPLATES
      if (path === '/api/templates' && method === 'GET') return withCors(() => handleGetTemplates(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/templates' && method === 'POST') return withCors(() => handleCreateTemplate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/templates\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTemplate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/templates\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteTemplate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: RECEPTION
      if (path === '/api/reception/queue' && method === 'GET') return withCors(() => handleGetReceptionQueue(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/reception/queue' && method === 'POST') return withCors(() => handleAddToQueue(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/reception\/queue\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateQueueStatus(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: ALERTS
      if (path === '/api/alerts' && method === 'GET') return withCors(() => handleGetAlerts(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/alerts' && method === 'POST') return withCors(() => handleCreateAlert(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/alerts/summary' && method === 'GET') return withCors(() => handleGetAlertSummary(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/alerts/read-all' && method === 'PUT') return withCors(() => handleMarkAllRead(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/alerts\/\d+\/read$/) && method === 'PUT') return withCors(() => handleMarkAlertRead(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/alerts\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteAlert(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 11.5: AUTOMATION
      if (path === '/api/automation/events' && method === 'POST') return withCors(() => handleAutomationEvent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 11.7: MARKETING AI (admin only)
      if (path === '/api/marketing/overview' && method === 'GET') {
        const mAuth = requireRole(user!, 'admin');
        if (mAuth) { Object.entries(corsHeaders).forEach(([k, v]) => mAuth.headers.set(k, v)); mAuth.headers.set('X-Request-Id', requestId); return mAuth; }
        return withCors(() => handleMarketingOverview(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      }
      if (path === '/api/marketing/content/generate' && method === 'POST') {
        const mAuth = requireRole(user!, 'admin');
        if (mAuth) { Object.entries(corsHeaders).forEach(([k, v]) => mAuth.headers.set(k, v)); mAuth.headers.set('X-Request-Id', requestId); return mAuth; }
        return withCors(() => handleMarketingContentGenerate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      }
      if (path === '/api/marketing/content' && method === 'GET') {
        const mAuth = requireRole(user!, 'admin');
        if (mAuth) { Object.entries(corsHeaders).forEach(([k, v]) => mAuth.headers.set(k, v)); mAuth.headers.set('X-Request-Id', requestId); return mAuth; }
        return withCors(() => handleMarketingContentList(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      }
      if (path.match(/^\/api\/marketing\/content\/\d+\/status$/) && method === 'PATCH') {
        const mAuth = requireRole(user!, 'admin');
        if (mAuth) { Object.entries(corsHeaders).forEach(([k, v]) => mAuth.headers.set(k, v)); mAuth.headers.set('X-Request-Id', requestId); return mAuth; }
        return withCors(() => handleMarketingContentStatus(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      }
      if (path === '/api/marketing/campaign/generate' && method === 'POST') {
        const mAuth = requireRole(user!, 'admin');
        if (mAuth) { Object.entries(corsHeaders).forEach(([k, v]) => mAuth.headers.set(k, v)); mAuth.headers.set('X-Request-Id', requestId); return mAuth; }
        return withCors(() => handleMarketingCampaignGenerate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      }
      if (path === '/api/marketing/seo/generate' && method === 'POST') {
        const mAuth = requireRole(user!, 'admin');
        if (mAuth) { Object.entries(corsHeaders).forEach(([k, v]) => mAuth.headers.set(k, v)); mAuth.headers.set('X-Request-Id', requestId); return mAuth; }
        return withCors(() => handleMarketingSeoGenerate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      }

      // FASE 3: TREATMENTS
      if (path === '/api/treatments' && method === 'GET') return withCors(() => handleGetTreatments(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/treatments' && method === 'POST') return withCors(() => handleCreateTreatment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/treatments\/\d+$/) && method === 'GET') return withCors(() => handleGetTreatment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/treatments\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTreatment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/treatments\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteTreatment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 3: CLINICAL NOTES
      if (path === '/api/clinical-notes' && method === 'GET') return withCors(() => handleGetClinicNotes(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/clinical-notes' && method === 'POST') return withCors(() => handleCreateNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientNotes(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+\/lock$/) && method === 'POST') return withCors(() => handleLockNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+\/unlock$/) && method === 'POST') return withCors(() => handleUnlockNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+\/sign$/) && method === 'POST') return withCors(() => handleSignNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+\/cosign$/) && method === 'POST') return withCors(() => handleCosignNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+\/versions$/) && method === 'GET') return withCors(() => handleGetNoteVersions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-notes\/\d+\/audit$/) && method === 'GET') return withCors(() => handleGetNoteAudit(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/clinical-notes/templates' && method === 'GET') return withCors(() => handleGetNoteTemplates(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 1: CLINICAL RECORDS (expediente clinico digital)
      if (path === '/api/clinical-records' && method === 'GET') return withCors(() => handleListRecords(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/clinical-records' && method === 'POST') return withCors(() => handleCreateRecord(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-records\/\d+$/) && method === 'GET') return withCors(() => handleGetRecord(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-records\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateRecord(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-records\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteRecord(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 1: SESSION NOTES (SOAP)
      if (path === '/api/session-notes' && method === 'GET') return withCors(() => handleListNotes(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/session-notes' && method === 'POST') return withCors(() => handleCreateSessionNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/session-notes\/\d+$/) && method === 'GET') return withCors(() => handleGetNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/session-notes\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateSessionNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/session-notes\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteSessionNote(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: CONSENTS
      if (path === '/api/consents' && method === 'GET') return withCors(() => handleListConsents(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/consents' && method === 'POST') return withCors(() => handleCreateConsent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/consents\/\d+$/) && method === 'GET') return withCors(() => handleGetConsent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/consents\/\d+\/revoke$/) && method === 'PUT') return withCors(() => handleRevokeConsent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/consents\/\d+\/sign$/) && method === 'POST') return withCors(() => handleSignConsent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/consents\/\d+\/signatures$/) && method === 'GET') return withCors(() => handleGetSignatures(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/consents\/\d+\/versions$/) && method === 'GET') return withCors(() => handleGetVersions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 12.4: CONSENT TEMPLATES
      if (path === '/api/consents/templates' && method === 'GET') return withCors(() => handleListTemplates(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/consents/templates' && method === 'POST') return withCors(() => handleCreateConsentTemplate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/consents\/templates\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateConsentTemplate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 3: TIMELINE
      if (path === '/api/timeline' && method === 'GET') return withCors(() => handleGetClinicTimeline(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/timeline' && method === 'POST') return withCors(() => handleCreateEvent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/timeline\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientTimeline(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 3: SESSIONS
      if (path === '/api/sessions/complete' && method === 'POST') return withCors(() => handleCompleteSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/sessions\/\d+$/) && method === 'GET') return withCors(() => handleGetSessions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/sessions\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: TMS ENGINE (dashboard, analisis, sugerencias)
      if (path === '/api/tms/engine/dashboard' && method === 'GET') return withCors(() => handleGetTmsDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/engine/efficiency' && method === 'GET') return withCors(() => handleGetProtocolEfficiency(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/engine\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/engine\/analyze\/\d+$/) && method === 'GET') return withCors(() => handleAnalyzeResponse(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/engine\/adjust\/\d+$/) && method === 'GET') return withCors(() => handleSuggestAdjustment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 12.7: ASSESSMENTS SCALES & SCORING (con auto-calc score y cutoffs)
      if (path === '/api/assessments' && method === 'POST') return withCors(() => handleCreateScaleAssessment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/assessments\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetScaleAssessmentsByPatient(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/assessments\/patient\/\d+\/\w+$/) && method === 'GET') return withCors(() => handleGetScaleAssessmentsByType(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/assessments/scales' && method === 'GET') return withCors(() => handleGetScales(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/assessments\/scales\/[\w]+\/cutoffs$/) && method === 'GET') return withCors(() => handleGetCutoffs(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/assessments\/\d+$/) && method === 'GET') return withCors(() => handleGetAssessmentById(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/assessments/preview' && method === 'POST') return withCors(() => handlePreviewScore(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // MH-EXPANSION 1.0: WELLBEING ASSESSMENTS (user-scoped, self-reported)
      if (path === '/api/assessments/wellbeing/scales' && method === 'GET') return withCors(() => handleGetWellbeingScales(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/assessments\/wellbeing\/scales\/[\w-]+\/cutoffs$/) && method === 'GET') return withCors(() => handleGetWellbeingCutoffs(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/assessments/wellbeing/list' && method === 'GET') return withCors(() => handleListWellbeingAssessments(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/assessments/wellbeing/preview' && method === 'POST') return withCors(() => handleWellbeingPreviewScore(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/assessments/wellbeing' && method === 'POST') return withCors(() => handleCreateWellbeingAssessment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/assessments\/wellbeing\/\d+$/) && method === 'GET') return withCors(() => handleGetWellbeingAssessmentById(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE MH: MENTAL HEALTH (bienestar personal, user-scoped, desacoplado del dominio clinico TMS)
      if (path === '/api/mh/home' && method === 'GET') return withCors(() => handleMhHome(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/checkins' && method === 'POST') return withCors(() => handleMhCreateCheckin(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/checkins' && method === 'GET') return withCors(() => handleMhListCheckins(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/checkins/trend' && method === 'GET') return withCors(() => handleMhTrendCheckins(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/interventions' && method === 'GET') return withCors(() => handleMhListInterventions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/interventions/sessions' && method === 'GET') return withCors(() => handleMhListSessions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/mh\/interventions\/\d+\/sessions$/) && method === 'POST') return withCors(() => handleMhCreateSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/mh\/interventions\/\d+$/) && method === 'GET') return withCors(() => handleMhGetIntervention(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/insights' && method === 'GET') return withCors(() => handleMhListInsights(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/mh\/insights\/\d+\/dismiss$/) && method === 'POST') return withCors(() => handleMhDismissInsight(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/export' && method === 'GET') return withCors(() => handleMhExport(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/account' && method === 'DELETE') return withCors(() => handleMhDeleteAccount(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/consents' && method === 'GET') return withCors(() => handleMhListConsents(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/consents' && method === 'POST') return withCors(() => handleMhUpsertConsent(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/journal' && method === 'GET') return withCors(() => handleMhListJournal(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/mh/journal' && method === 'POST') return withCors(() => handleMhCreateJournal(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: TMS PROTOCOLS
      if (path === '/api/tms/protocols' && method === 'GET') return withCors(() => handleGetProtocols(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/protocols' && method === 'POST') return withCors(() => handleCreateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/protocols/suggest' && method === 'POST') return withCors(() => handleSuggestProtocol(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/protocols\/\d+$/) && method === 'GET') return withCors(() => handleGetProtocol(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/protocols\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/protocols\/\d+\/deactivate$/) && method === 'PUT') return withCors(() => handleDeactivateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: MOTOR THRESHOLDS
      if (path === '/api/tms/motor-thresholds' && method === 'GET') return withCors(() => handleGetClinicMeasurements(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/motor-thresholds' && method === 'POST') return withCors(() => handleRecordMeasurement(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/motor-thresholds\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetMotorThresholds(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/motor-thresholds\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteMeasurement(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: TMS PROFILES (asignacion de protocolo a paciente)
      if (path === '/api/tms/profiles' && method === 'GET') return withCors(() => handleGetClinicProfiles(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/profiles' && method === 'POST') return withCors(() => handleCreateProfile(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/profiles\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientProfiles(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/profiles\/\d+$/) && method === 'GET') return withCors(() => handleGetProfile(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/profiles\/\d+\/activate$/) && method === 'PUT') return withCors(() => handleActivateProfile(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/profiles\/\d+\/complete$/) && method === 'PUT') return withCors(() => handleCompleteProfile(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/profiles\/\d+\/discontinue$/) && method === 'PUT') return withCors(() => handleDiscontinueProfile(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: TMS SESSIONS
      if (path === '/api/tms/sessions' && method === 'POST') return withCors(() => handleCreateTmsSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/sessions/complete' && method === 'POST') return withCors(() => handleCompleteTmsSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/sessions\/\d+$/) && method === 'GET') return withCors(() => handleGetProfileSessions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/sessions\/\d+$/) && method === 'PUT') return withCors(() => handleUpdateTmsSessionStatus(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: CLINICAL RESPONSE TRACKING
      if (path === '/api/tms/clinical-response' && method === 'POST') return withCors(() => handleRecordResponse(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/clinical-response\/patient\/\d+\/curve$/) && method === 'GET') return withCors(() => handleGetProgressCurve(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/clinical-response\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientResponses(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/clinical-response\/session\/\d+$/) && method === 'GET') return withCors(() => handleGetSessionResponse(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 5: ADVERSE EFFECTS
      if (path === '/api/tms/adverse-effects' && method === 'POST') return withCors(() => handleRecordEffect(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/adverse-effects/stats' && method === 'GET') return withCors(() => handleGetEffectStats(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/adverse-effects\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientEffects(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/adverse-effects\/\d+\/resolve$/) && method === 'PUT') return withCors(() => handleResolveEffect(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 7: DIGITAL TWIN
      if (path === '/api/tms/digital-twin/predict' && method === 'POST') return withCors(() => handlePredictResponse(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/digital-twin\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientPredictions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/digital-twin\/history\/\d+$/) && method === 'GET') return withCors(() => handleGetPredictionHistory(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/digital-twin\/confidence\/\d+$/) && method === 'GET') return withCors(() => handleEvaluateConfidence(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 7: SIMULATION
      if (path === '/api/tms/simulation/simulate' && method === 'POST') return withCors(() => handleSimulateProtocol(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/simulation/compare' && method === 'POST') return withCors(() => handleCompareProtocols(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/simulation\/history\/\d+$/) && method === 'GET') return withCors(() => handleGetComparisonHistory(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/tms/simulation/dashboard' && method === 'GET') return withCors(() => handleGetSimulationDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/simulation\/brain\/\d+$/) && method === 'GET') return withCors(() => handleGetBrainState(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 7: REPORTS
      if (path === '/api/tms/reports/generate' && method === 'POST') return withCors(() => handleGenerateReport(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/reports\/treatment\/\d+$/) && method === 'GET') return withCors(() => handleGetTreatmentSummary(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/reports\/export\/\d+$/) && method === 'GET') return withCors(() => handleExportCSV(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/tms\/reports\/history\/\d+$/) && method === 'GET') return withCors(() => handleGetReportHistory(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 8: PATIENT JOURNEY (integration)
      if (path === '/api/journey/reception' && method === 'GET') return withCors(() => handleGetReceptionView(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/journey/therapist' && method === 'GET') return withCors(() => handleGetTherapistView(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/journey/start-treatment' && method === 'POST') return withCors(() => handleStartTreatment(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/journey/complete-session' && method === 'POST') return withCors(() => handleJourneyCompleteSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/journey\/patient\/\d+$/) && method === 'GET') return withCors(() => handleGetPatientJourney(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/journey\/discharge\/\d+$/) && method === 'POST') return withCors(() => handleDischargePatient(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // COS-L: CLINICAL OPERATING SYSTEM LAYER (require auth + admin role)
      if (path === '/api/cos/today' && method === 'GET') return withCors(() => handleCosToday(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/next-action' && method === 'GET') return withCors(() => handleCosNextAction(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/patient-states' && method === 'GET') return withCors(() => handleCosPatientStates(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/tasks' && method === 'GET') return withCors(() => handleCosTasks(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/cos/alerts' && method === 'GET') return withCors(() => handleCosAlerts(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);

      // FASE 4: QUALITY METRICS (ISO 9001)
      if (path === '/api/quality-metrics' && method === 'GET') return withCors(() => handleListMetrics(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/quality-metrics' && method === 'POST') return withCors(() => handleCreateMetric(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/quality-metrics/summary' && method === 'GET') return withCors(() => handleGetSummary(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/quality-metrics/dashboard' && method === 'GET') return withCors(() => handleGetDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/quality-metrics\/\d+$/) && method === 'GET') return withCors(() => handleGetMetric(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/quality-metrics\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteMetric(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 3: SECURITY INCIDENTS
      if (path === '/api/security-incidents' && method === 'GET') return withCors(() => handleListIncidents(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/security-incidents' && method === 'POST') return withCors(() => handleCreateIncident(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/security-incidents\/\d+$/) && method === 'GET') return withCors(() => handleGetIncident(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/security-incidents\/\d+\/resolve$/) && method === 'PUT') return withCors(() => handleResolveIncident(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/security-incidents\/\d+$/) && method === 'DELETE') return withCors(() => handleDeleteIncident(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 2: DOCUMENT MANAGEMENT
      if (path === '/api/documents' && method === 'GET') return withCors(() => handleListDocuments(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/documents' && method === 'POST') return withCors(() => handleCreateDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/documents\/\d+$/) && method === 'GET') return withCors(() => handleGetDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/documents\/\d+\/sign$/) && method === 'PUT') return withCors(() => handleSignDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/documents\/\d+\/archive$/) && method === 'PUT') return withCors(() => handleArchiveDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/documents\/\d+\/supersede$/) && method === 'POST') return withCors(() => handleSupersedeDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/documents\/\d+\/download$/) && method === 'GET') return withCors(() => handleDownloadDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

      // FASE 4: BACKUPS
       if (path === '/api/backups/run' && method === 'POST') return withCors(() => handleRunBackup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups/latest' && method === 'GET') return withCors(() => handleGetLatestBackup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups' && method === 'GET') return withCors(() => handleListBackups(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

       // FASE 6: DISASTER RECOVERY
       if (path === '/api/backups/restore' && method === 'POST') return withCors(() => handleRestoreFromBackup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups/restore/latest' && method === 'POST') return withCors(() => handleRestoreFromLatest(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups/restore/by-date' && method === 'POST') return withCors(() => handleRestoreByDate(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups/verify' && method === 'POST') return withCors(() => handleVerifyBackup(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups/fire-drill' && method === 'POST') return withCors(() => handleFireDrill(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
       if (path === '/api/backups/restores' && method === 'GET') return withCors(() => handleListRestores(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

// FASE 7: OBSERVABILITY
        if (path === '/api/observability/dashboard' && method === 'GET') return withCors(() => handleObservabilityDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/observability/events' && method === 'GET') return withCors(() => handleObservabilityEvents(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/observability/metrics' && method === 'GET') return withCors(() => handleObservabilityMetrics(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/observability/health-history' && method === 'GET') return withCors(() => handleObservabilityHealthHistory(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/observability/alerts' && method === 'GET') return withCors(() => handleObservabilityAlerts(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/observability/export' && method === 'GET') return withCors(() => handleObservabilityExport(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

        // FASE 4: PERFORMANCE ENGINEERING
        if (path === '/api/performance/dashboard' && method === 'GET') return withCors(() => handlePerformanceDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/performance/slow-queries' && method === 'GET') return withCors(() => handleSlowQueries(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/performance/query-profiles' && method === 'GET') return withCors(() => handleQueryProfiles(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/performance/cache-stats' && method === 'GET') return withCors(() => handleCacheStats(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/performance/worker-performance' && method === 'GET') return withCors(() => handleWorkerPerformance(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/performance/anomalies' && method === 'GET') return withCors(() => handleAnomalies(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

        // FASE 5: CRON MANAGER
        if (path === '/api/cron/dashboard' && method === 'GET') return withCors(() => handleCronDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/jobs' && method === 'GET') return withCors(() => handleCronJobs(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/jobs' && method === 'POST') return withCors(() => handleCronJobs(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/jobs' && method === 'PATCH') return withCors(() => handleCronJobDetail(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/jobs' && method === 'DELETE') return withCors(() => handleCronJobDetail(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/run' && method === 'POST') return withCors(() => handleRunCronJob(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/executions' && method === 'GET') return withCors(() => handleCronExecutions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/failures' && method === 'GET') return withCors(() => handleCronFailures(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/cron/failures/resolve' && method === 'POST') return withCors(() => handleResolveCronFailure(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

        // FASE 3: ADVANCED SECURITY
        if (path === '/api/security/events' && method === 'GET') return withCors(() => handleSecurityEvents(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/dashboard' && method === 'GET') return withCors(() => handleSecurityDashboard(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/block-ip' && method === 'POST') return withCors(() => handleBlockIP(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/unblock-ip' && method === 'POST') return withCors(() => handleUnblockIP(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/blocked-ips' && method === 'GET') return withCors(() => handleBlockedIPs(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/sessions' && method === 'GET') return withCors(() => handleUserSessions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/revoke-session' && method === 'POST') return withCors(() => handleRevokeSession(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/revoke-all-sessions' && method === 'POST') return withCors(() => handleRevokeAllSessions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/trust-device' && method === 'POST') return withCors(() => handleTrustDevice(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/rotate-secret' && method === 'POST') return withCors(() => handleRotateSecret(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/document-integrity' && method === 'GET') return withCors(() => handleDocumentIntegrity(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/verify-document' && method === 'POST') return withCors(() => handleVerifyDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
        if (path === '/api/security/scan-document' && method === 'POST') return withCors(() => handleScanDocument(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);

        // COMPLIANCE ENGINE
      if (path === '/api/compliance/dashboard' && method === 'GET') return withCors(() => handleComplianceDashboard(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/compliance/alerts' && method === 'GET') return withCors(() => handleComplianceAlerts(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/compliance/run' && method === 'POST') return withCors(() => handleComplianceRun(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      if (path === '/api/compliance/report' && method === 'GET') {
        const format = new URL(request.url).searchParams.get('format');
        if (format === 'csv') return withCors(() => handleComplianceReportCsv(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
        return withCors(() => handleComplianceReportJson(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
      }

      // FASE 11.8: CLINICAL CHAT AI (admin only)
      if (path === '/api/clinical-chat/sessions' && method === 'GET') return withCors(() => handleClinicalChatSessions(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path === '/api/clinical-chat/stats' && method === 'GET') return withCors(() => handleClinicalChatStats(env, request, user!, corsHeaders), corsHeaders, requestId, env, request, user!);
      if (path.match(/^\/api\/clinical-chat\/sessions\/[^/]+\/messages$/) && method === 'GET') {
        const parts = path.split('/');
        const sessionId = parts[3];
        return withCors(() => handleClinicalChatSessionMessages(env, request, user!, corsHeaders, sessionId), corsHeaders, requestId, env, request, user!);
      }

      return jsonError('Not found', 404, corsHeaders, requestId);
    } catch (err) {
      console.error(`[${requestId}] Worker error:`, err);
      return jsonError('Internal error', 500, corsHeaders, requestId);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const requestId = generateRequestId();
    const now = new Date();
    const hour = now.getUTCHours();
    const dateStr = now.toISOString().split('T')[0];

    console.log(`[${requestId}] Cron started at hour ${hour} UTC`);

    // Always generate reminders every hour
    try {
      await generateReminders(env, 1);
      console.log(`[${requestId}] Reminders generated`);
    } catch (err) {
      console.error(`[${requestId}] Reminders failed:`, err);
    }

    // Hourly compliance check (every hour)
    try {
      const repo = new ComplianceRepository(env);
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      const correlationId = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      const patients = await env.DB.prepare("SELECT id FROM patients").all<{ id: number }>();
      const ids = (patients.results || []).map((r: { id: number }) => r.id);

      let totalRules = 0;
      let totalAlerts = 0;

      for (const patientId of ids) {
        try {
          const results = await executeAllRules(patientId, env);
          totalRules += results.length;
          const alerts = await repo.getAlertsByPatient(patientId);
          for (const result of results) {
            if (!result.passed && result.ruleId) {
              const alertId = await repo.createAlert({
                ruleCode: result.ruleId,
                category: "NOM",
                severity: result.severity,
                patientId,
                message: result.message,
              });
              logComplianceEvent(env, "alert_created", {
                patientId, ruleCode: result.ruleId, alertId,
                severity: result.severity, message: result.message,
                clinicId: 1, correlationId, result: "FAILURE",
              });
            } else if (result.passed && result.ruleId) {
              const open = alerts.find(
                (a: any) =>
                  (a.rule_code || a.ruleCode) === result.ruleId &&
                  (a as any).status === "OPEN"
              );
              if (open) {
                await repo.closeAlert(open.id as number, undefined);
                totalAlerts++;
                logComplianceEvent(env, "alert_resolved", {
                  patientId, ruleCode: result.ruleId,
                  alertId: open.id as number, message: "Auto-resuelta",
                  clinicId: 1, correlationId, result: "SUCCESS",
                });
              }
            }
          }
        } catch (err) {
          console.error(`[${requestId}] Patient ${patientId} evaluation failed:`, err);
        }
      }

      const score = repo.getDashboardMetrics ? (await repo.getDashboardMetrics(1)).score : 0;
      await repo.saveRun({ rulesExecuted: totalRules, alertsCreated: totalAlerts, score });
      logComplianceEvent(env, "compliance_run", {
        message: `Cron ${dateStr}: ${ids.length} pacientes, ${totalRules} reglas, ${totalAlerts} alertas resueltas`,
        clinicId: 1, correlationId,
        result: score >= 95 ? "SUCCESS" : "WARNING",
      });
      console.log(`[${requestId}] Compliance: ${ids.length} patients, ${totalRules} rules, ${totalAlerts} alerts resolved`);
    } catch (err) {
      console.error(`[${requestId}] Compliance evaluation failed:`, err);
    }

    // Hourly backup check (run if no backup today)
    if (hour >= 3 && hour <= 4) {
      console.log(`[${requestId}] Daily backup window (hour ${hour})`);
      try {
        const { BackupService } = await import('./domains/backups/service');
        const service = new BackupService(env);
        const result = await service.runBackup(1);
        if (result.success) {
          const backupData = result.data as { size_bytes: number; sha256: string } | undefined;
          console.log(`[${requestId}] Backup completed: ${backupData?.size_bytes} bytes, SHA-256: ${backupData?.sha256}`);
        } else {
          console.error(`[${requestId}] Backup failed: ${result.error}`);
        }
      } catch (err) {
        console.error(`[${requestId}] Backup failed:`, err);
      }
    }

    console.log(`[${requestId}] Cron cycle completed at hour ${hour}`);
  },
};
