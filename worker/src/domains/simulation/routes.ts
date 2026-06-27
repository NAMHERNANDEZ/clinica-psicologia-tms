import type { Env, User } from '../../types';
import { validateSimulationRequest, validateComparisonRequest } from './validators';
import {
  simulateProtocol,
  compareProtocols,
  getComparisonHistory,
  getSimulationDashboard,
} from './service';
import { getBrainState, getTargetRegion, getBrainRegions } from './brain';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

export async function handleSimulateProtocol(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as Record<string, unknown>;
    const validation = validateSimulationRequest(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', ') }, 400, corsHeaders);
    }

    const result = await simulateProtocol(env, user.clinic_id, body.protocol_id as number, body.patient_id as number);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCompareProtocols(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as Record<string, unknown>;
    const validation = validateComparisonRequest(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', ') }, 400, corsHeaders);
    }

    const result = await compareProtocols(
      env,
      user.clinic_id,
      body.patient_id as number,
      body.protocol_a_id as number,
      body.protocol_b_id as number
    );

    await env.DB.prepare(
      `INSERT INTO simulation_comparisons (clinic_id, patient_id, protocol_a_id, protocol_b_id, result_a, result_b, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      user.clinic_id,
      body.patient_id,
      body.protocol_a_id,
      body.protocol_b_id,
      JSON.stringify(result.comparison.protocol_a),
      JSON.stringify(result.comparison.protocol_b),
      user.id
    ).run();

    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetComparisonHistory(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const patientId = parseInt(pathParts[pathParts.length - 1] ?? '0', 10);
    if (!patientId || isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient_id' }, 400, corsHeaders);
    }

    const result = await getComparisonHistory(env, patientId);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetSimulationDashboard(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const result = await getSimulationDashboard(env, user.clinic_id);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetBrainState(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const protocolId = parseInt(pathParts[pathParts.length - 1] ?? '0', 10);
    if (!protocolId || isNaN(protocolId)) {
      return json({ success: false, error: 'Invalid protocol_id' }, 400, corsHeaders);
    }

    const protocolRow = await env.DB.prepare(
      `SELECT id, name, target_area, frequency_hz, total_sessions
       FROM tms_protocols WHERE id = ? AND clinic_id = ?`
    ).bind(protocolId, user.clinic_id).first();

    if (!protocolRow) {
      return json({ success: false, error: 'Protocol not found' }, 404, corsHeaders);
    }

    const targetRegion = getTargetRegion((protocolRow.target_area as string) ?? '');
    const regions = getBrainRegions();
    const totalSessions = (protocolRow.total_sessions as number) ?? 30;

    const progress = 0.5;
    const brainStates = regions.map(region => {
      const isTarget = region === targetRegion;
      return getBrainState(region, isTarget ? progress : 0, isTarget);
    });

    return json({
      success: true,
      data: {
        protocol_id: protocolRow.id,
        protocol_name: protocolRow.name,
        target_region: targetRegion,
        regions: brainStates,
        estimated_sessions: totalSessions,
        frequency_hz: protocolRow.frequency_hz,
      },
    }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
