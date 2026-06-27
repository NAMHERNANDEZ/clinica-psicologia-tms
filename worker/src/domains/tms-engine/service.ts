import type { Env } from '../../types';
import * as repo from './repository';

export async function getPatientDashboard(env: Env, patientId: number) {
  const profile = await repo.getPatientProfile(env, patientId);
  if (!profile) {
    return { success: false, error: 'No se encontró perfil TMS activo para el paciente', status: 404 };
  }

  const [motorThreshold, responseHistory, activeEffects, sessionHistory, latestAssessments] = await Promise.all([
    repo.getLatestMotorThreshold(env, patientId),
    repo.getResponseHistory(env, patientId),
    repo.getActiveEffects(env, patientId),
    repo.getSessionHistory(env, profile.id),
    repo.getLatestAssessments(env, patientId),
  ]);

  const completedSessions = sessionHistory.filter(s => s.status === 'completed').length;
  const totalPlannedSessions = profile.protocol_id
    ? (await env.DB.prepare('SELECT total_sessions FROM tms_protocols WHERE id = ?').bind(profile.protocol_id).first<{ total_sessions: number }>())?.total_sessions ?? 20
    : 20;

  const responseCurve = responseHistory.map(r => ({
    session_number: r.session_number,
    mood_score: r.mood_score,
    energy_score: r.energy_score,
    anxiety_score: r.anxiety_score,
    overall_response: r.overall_response,
    date: r.created_at,
  }));

  const latestScores = responseHistory.length > 0
    ? responseHistory[responseHistory.length - 1]
    : null;

  const baselineComparison = latestScores && profile.baseline_bdi
    ? {
        bdi_change: profile.baseline_bdi - (latestAssessments.bdi?.score ?? profile.baseline_bdi),
        gad7_change: profile.baseline_gad7 ? (profile.baseline_gad7 - (latestAssessments.gad7?.score ?? profile.baseline_gad7)) : null,
        phq9_change: profile.baseline_phq9 ? (profile.baseline_phq9 - (latestAssessments.phq9?.score ?? profile.baseline_phq9)) : null,
      }
    : null;

  return {
    success: true,
    data: {
      profile,
      motor_threshold: motorThreshold,
      sessions: {
        completed: completedSessions,
        total: totalPlannedSessions,
        percentage: totalPlannedSessions > 0 ? Math.round((completedSessions / totalPlannedSessions) * 100) : 0,
        history: sessionHistory,
      },
      response_curve: responseCurve,
      active_effects: activeEffects,
      latest_scores: latestScores,
      latest_assessments: latestAssessments,
      baseline_comparison: baselineComparison,
    },
  };
}

export async function analyzeResponse(env: Env, patientId: number) {
  const profile = await repo.getPatientProfile(env, patientId);
  if (!profile) {
    return { success: false, error: 'No se encontró perfil TMS activo', status: 404 };
  }

  const responseHistory = await repo.getResponseHistory(env, patientId);
  if (responseHistory.length < 2) {
    return {
      success: true,
      data: {
        status: 'insufficient_data',
        message: 'Se necesitan al menos 2 sesiones con respuestas para analizar la curva',
        sessions_analyzed: responseHistory.length,
        responses: responseHistory,
      },
    };
  }

  const firstScore = responseHistory[0].overall_response;
  const lastScore = responseHistory[responseHistory.length - 1].overall_response;
  const totalChange = lastScore - firstScore;
  const percentageChange = firstScore !== 0 ? Math.round((totalChange / firstScore) * 100) : 0;

  const completedSessions = profile.protocol_id
    ? (await env.DB.prepare('SELECT total_sessions FROM tms_protocols WHERE id = ?').bind(profile.protocol_id).first<{ total_sessions: number }>())?.total_sessions ?? 20
    : 20;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (totalChange > 0.5) trend = 'improving';
  else if (totalChange < -0.5) trend = 'declining';

  const lastTenSessions = responseHistory.slice(-10);
  const avgLastTen = lastTenSessions.reduce((sum, r) => sum + r.overall_response, 0) / lastTenSessions.length;

  const firstFiveSessions = responseHistory.slice(0, 5);
  const avgFirstFive = firstFiveSessions.length > 0
    ? firstFiveSessions.reduce((sum, r) => sum + r.overall_response, 0) / firstFiveSessions.length
    : firstScore;

  const earlyImprovement = avgFirstFive - firstScore;
  const recentPerformance = avgLastTen - firstScore;

  let nonResponseDetected = false;
  const completedCount = responseHistory.length;
  if (completedCount >= 10 && percentageChange < 20) {
    nonResponseDetected = true;
  }

  const sessionProgress = responseHistory.map((r, i) => {
    const nextScore = i < responseHistory.length - 1 ? responseHistory[i + 1].overall_response : null;
    return {
      session_number: r.session_number,
      score: r.overall_response,
      mood: r.mood_score,
      anxiety: r.anxiety_score,
      change_from_previous: i > 0 ? r.overall_response - responseHistory[i - 1].overall_response : 0,
    };
  });

  const peakSession = responseHistory.reduce((peak, r) =>
    r.overall_response > peak.overall_response ? r : peak
  , responseHistory[0]);

  return {
    success: true,
    data: {
      trend,
      total_change: Math.round(totalChange * 100) / 100,
      percentage_change: percentageChange,
      first_score: firstScore,
      current_score: lastScore,
      peak_session: {
        session_number: peakSession.session_number,
        score: peakSession.overall_response,
      },
      average_last_10: Math.round(avgLastTen * 100) / 100,
      average_first_5: Math.round(avgFirstFive * 100) / 100,
      early_improvement: Math.round(earlyImprovement * 100) / 100,
      recent_performance: Math.round(recentPerformance * 100) / 100,
      non_response_detected: nonResponseDetected,
      sessions_analyzed: completedCount,
      sessions_remaining: Math.max(0, completedSessions - completedCount),
      session_progress: sessionProgress,
    },
  };
}

export async function suggestAdjustment(env: Env, patientId: number) {
  const profile = await repo.getPatientProfile(env, patientId);
  if (!profile) {
    return { success: false, error: 'No se encontró perfil TMS activo', status: 404 };
  }

  const [responseHistory, activeEffects, motorThreshold] = await Promise.all([
    repo.getResponseHistory(env, patientId),
    repo.getActiveEffects(env, patientId),
    repo.getLatestMotorThreshold(env, patientId),
  ]);

  const suggestions: string[] = [];
  const warnings: string[] = [];
  const adjustments: { parameter: string; current_value: string | number; suggested_value: string | number; reason: string }[] = [];

  if (responseHistory.length >= 10) {
    const firstScore = responseHistory[0].overall_response;
    const lastScore = responseHistory[responseHistory.length - 1].overall_response;
    const percentageChange = firstScore !== 0 ? Math.round(((lastScore - firstScore) / firstScore) * 100) : 0;

    if (percentageChange < 20) {
      warnings.push('Non-response detectado: <20% de mejora después de 10 sesiones');
      suggestions.push('Considerar cambio de parámetros o protocolo');

      if (profile.protocol_id) {
        const protocol = await env.DB.prepare(
          'SELECT * FROM tms_protocols WHERE id = ?'
        ).bind(profile.protocol_id).first<{ frequency_hz: number; intensity_pct_mt: number; target_area: string; stimulation_type: string }>();

        if (protocol) {
          if (protocol.intensity_pct_mt < 120) {
            adjustments.push({
              parameter: 'intensity_pct_mt',
              current_value: protocol.intensity_pct_mt,
              suggested_value: protocol.intensity_pct_mt + 10,
              reason: 'Incrementar intensidad para mejorar respuesta',
            });
          }

          if (protocol.frequency_hz === 1) {
            adjustments.push({
              parameter: 'frequency_hz',
              current_value: protocol.frequency_hz,
              suggested_value: 10,
              reason: 'Cambiar de TMS de baja frecuencia a alta frecuencia',
            });
          }

          if (protocol.target_area === 'left_dlpfc') {
            adjustments.push({
              parameter: 'target_area',
              current_value: protocol.target_area,
              suggested_value: 'right_dlpfc',
              reason: 'Considerar cambio de área diana',
            });
          }
        }
      }
    }
  }

  if (activeEffects.length > 0) {
    const severeEffects = activeEffects.filter(e => e.severity === 'severe');
    const moderateEffects = activeEffects.filter(e => e.severity === 'moderate');

    if (severeEffects.length > 0) {
      warnings.push(`${severeEffects.length} efecto(s) adverso(s) severo(s) activo(s)`);
      suggestions.push('Considerar reducir intensidad o pausar tratamiento');

      if (motorThreshold) {
        adjustments.push({
          parameter: 'intensity_pct_mt',
          current_value: motorThreshold.mt_pct,
          suggested_value: Math.round(motorThreshold.mt_pct * 0.9),
          reason: 'Reducir intensidad por efectos adversos severos',
        });
      }
    }

    if (moderateEffects.length > 0) {
      warnings.push(`${moderateEffects.length} efecto(s) adverso(s) moderado(s) activo(s)`);
      suggestions.push('Monitorear de cerca; considerar reducir intensidad si persisten');
    }
  }

  if (responseHistory.length >= 5) {
    const recentScores = responseHistory.slice(-5);
    const trend = recentScores[recentScores.length - 1].overall_response - recentScores[0].overall_response;

    if (trend < -1) {
      warnings.push('Tendencia decreciente en las últimas 5 sesiones');
      suggestions.push('Evaluar factores externos y considerar ajuste de parámetros');
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('No se requieren ajustes en este momento. Continuar con el protocolo actual');
  }

  return {
    success: true,
    data: {
      needs_adjustment: adjustments.length > 0,
      suggestions,
      warnings,
      proposed_adjustments: adjustments,
      active_effects_count: activeEffects.length,
      response_trend: responseHistory.length >= 2
        ? responseHistory[responseHistory.length - 1].overall_response - responseHistory[0].overall_response
        : null,
    },
  };
}

export async function getProtocolEfficiency(env: Env, clinicId: number) {
  const efficiencyData = await repo.getProtocolEfficiencyData(env, clinicId);

  const protocols = efficiencyData.map(p => ({
    protocol_id: p.protocol_id,
    protocol_name: p.protocol_name,
    indication: p.indication,
    target_area: p.target_area,
    total_patients: p.total_patients,
    avg_response: p.avg_response ? Math.round(p.avg_response * 100) / 100 : null,
    completion_rate: p.completion_rate,
    adverse_effect_rate: p.adverse_effect_rate,
  }));

  const totalPatients = protocols.reduce((sum, p) => sum + p.total_patients, 0);
  const avgCompletionRate = protocols.length > 0
    ? Math.round(protocols.reduce((sum, p) => sum + p.completion_rate, 0) / protocols.length)
    : 0;
  const avgAdverseEffectRate = protocols.length > 0
    ? Math.round(protocols.reduce((sum, p) => sum + p.adverse_effect_rate, 0) / protocols.length)
    : 0;

  return {
    success: true,
    data: {
      protocols,
      summary: {
        total_protocols: protocols.length,
        total_patients: totalPatients,
        avg_completion_rate: avgCompletionRate,
        avg_adverse_effect_rate: avgAdverseEffectRate,
      },
    },
  };
}

export async function getTmsDashboard(env: Env, clinicId: number) {
  const [activePatients, sessionsToday, responseRates, protocolDistribution] = await Promise.all([
    repo.getActivePatientsCount(env, clinicId),
    repo.getSessionsTodayCount(env, clinicId),
    repo.getResponseRateStats(env, clinicId),
    repo.getProtocolDistribution(env, clinicId),
  ]);

  const totalPatients = responseRates.improving + responseRates.stable + responseRates.declining;
  const responseRatePercentages = totalPatients > 0
    ? {
        improving: Math.round((responseRates.improving / totalPatients) * 100),
        stable: Math.round((responseRates.stable / totalPatients) * 100),
        declining: Math.round((responseRates.declining / totalPatients) * 100),
      }
    : { improving: 0, stable: 0, declining: 0 };

  return {
    success: true,
    data: {
      active_patients: activePatients,
      sessions_today: sessionsToday,
      response_rates: {
        improving: responseRates.improving,
        stable: responseRates.stable,
        declining: responseRates.declining,
        percentages: responseRatePercentages,
      },
      protocol_distribution: protocolDistribution,
    },
  };
}
