import type { Env, User } from '../../types';
import { validateReportGenerateInput } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGenerateReport(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateReportGenerateInput(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', '), requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const { patient_id, format, sections } = validation.data!;
    const effectiveSections = sections && sections.length > 0 ? sections : ['summary', 'scores', 'timeline', 'adverse_effects', 'predictions'];

    if (format === 'csv') {
      const csv = await service.exportCSV(env, patient_id, effectiveSections);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report_patient_${patient_id}.csv"`,
          ...corsHeaders,
        },
      });
    }

    const report = await service.generateTreatmentSummary(env, patient_id);
    return json({ success: true, data: report, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleGetTreatmentSummary(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 1] || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient ID', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const report = await service.generateTreatmentSummary(env, patientId);
    return json({ success: true, data: report, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleExportCSV(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 1] || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient ID', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const sectionsParam = url.searchParams.get('sections');
    const sections = sectionsParam ? sectionsParam.split(',') : ['summary', 'scores', 'adverse_effects', 'predictions'];

    const csv = await service.exportCSV(env, patientId, sections);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report_patient_${patientId}.csv"`,
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleGetReportHistory(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 1] || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient ID', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const history = await service.getReportHistory(env, patientId);
    return json({ success: true, data: history, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}
