import type { Env } from '../../types';

interface TmsPatientProfile {
  id: number;
  clinic_id: number;
  patient_id: number;
  protocol_id: number;
  motor_threshold_id: number | null;
  assigned_diagnosis: string | null;
  baseline_bdi: number | null;
  baseline_gad7: number | null;
  baseline_phq9: number | null;
  status: string;
  start_date: string;
}

interface MotorThreshold {
  id: number;
  patient_id: number;
  mt_pct: number;
  measured_at: string;
}

interface ClinicalResponse {
  id: number;
  tms_session_id: number;
  patient_id: number;
  mood_score: number | null;
  energy_score: number | null;
  anxiety_score: number | null;
  overall_response: number;
  created_at: string;
  session_number: number;
}

interface AdverseEffect {
  id: number;
  patient_id: number;
  tms_session_id: number;
  effect_type: string;
  severity: 'mild' | 'moderate' | 'severe';
  resolved: number;
  created_at: string;
}

interface TmsSession {
  id: number;
  profile_id: number;
  session_number: number;
  motor_threshold_pct: number;
  intensity_pct_mt: number;
  effective_intensity: number | null;
  status: string;
  completed_at: string | null;
}

interface ClinicalAssessment {
  id: number;
  patient_id: number;
  assessment_type: string;
  score: number;
  max_score: number;
  administered_at: string;
}

interface ProtocolEfficiency {
  protocol_id: number;
  protocol_name: string;
  indication: string;
  target_area: string;
  total_patients: number;
  avg_response: number | null;
  completion_rate: number;
  adverse_effect_rate: number;
}

export async function getPatientProfile(env: Env, patientId: number): Promise<TmsPatientProfile | null> {
  const row = await env.DB.prepare(
    `SELECT id, clinic_id, patient_id, protocol_id, motor_threshold_id, assigned_diagnosis, baseline_bdi, baseline_gad7, baseline_phq9, status, start_date
     FROM tms_patient_profiles WHERE patient_id = ? AND status = 'active'`
  ).bind(patientId).first<TmsPatientProfile>();
  return row ?? null;
}

export async function getLatestMotorThreshold(env: Env, patientId: number): Promise<MotorThreshold | null> {
  const row = await env.DB.prepare(
    `SELECT id, patient_id, mt_pct, measured_at
     FROM motor_thresholds WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 1`
  ).bind(patientId).first<MotorThreshold>();
  return row ?? null;
}

export async function getResponseHistory(env: Env, patientId: number): Promise<ClinicalResponse[]> {
  const { results } = await env.DB.prepare(
    `SELECT crt.id, crt.tms_session_id, crt.patient_id, crt.mood_score, crt.energy_score, crt.anxiety_score,
            crt.overall_response, crt.created_at, ts.session_number
     FROM clinical_response_tracking crt
     JOIN tms_sessions ts ON crt.tms_session_id = ts.id
     WHERE crt.patient_id = ?
     ORDER BY ts.session_number ASC`
  ).bind(patientId).all<ClinicalResponse>();
  return results;
}

export async function getActiveEffects(env: Env, patientId: number): Promise<AdverseEffect[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, patient_id, tms_session_id, effect_type, severity, resolved, created_at
     FROM adverse_effects WHERE patient_id = ? AND resolved = 0 ORDER BY created_at DESC`
  ).bind(patientId).all<AdverseEffect>();
  return results;
}

export async function getSessionHistory(env: Env, profileId: number): Promise<TmsSession[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, profile_id, session_number, motor_threshold_pct, intensity_pct_mt, effective_intensity, status, completed_at
     FROM tms_sessions WHERE profile_id = ? ORDER BY session_number ASC`
  ).bind(profileId).all<TmsSession>();
  return results;
}

export async function getLatestAssessments(env: Env, patientId: number): Promise<{ bdi: ClinicalAssessment | null; gad7: ClinicalAssessment | null; phq9: ClinicalAssessment | null }> {
  const bdi = await env.DB.prepare(
    `SELECT id, patient_id, assessment_type, score, max_score, administered_at
     FROM clinical_assessments WHERE patient_id = ? AND assessment_type = 'bdi' ORDER BY administered_at DESC LIMIT 1`
  ).bind(patientId).first<ClinicalAssessment>();

  const gad7 = await env.DB.prepare(
    `SELECT id, patient_id, assessment_type, score, max_score, administered_at
     FROM clinical_assessments WHERE patient_id = ? AND assessment_type = 'gad7' ORDER BY administered_at DESC LIMIT 1`
  ).bind(patientId).first<ClinicalAssessment>();

  const phq9 = await env.DB.prepare(
    `SELECT id, patient_id, assessment_type, score, max_score, administered_at
     FROM clinical_assessments WHERE patient_id = ? AND assessment_type = 'phq9' ORDER BY administered_at DESC LIMIT 1`
  ).bind(patientId).first<ClinicalAssessment>();

  return {
    bdi: bdi ?? null,
    gad7: gad7 ?? null,
    phq9: phq9 ?? null,
  };
}

export async function getProtocolEfficiencyData(env: Env, clinicId: number): Promise<ProtocolEfficiency[]> {
  const { results } = await env.DB.prepare(
    `SELECT
       p.id as protocol_id,
       p.name as protocol_name,
       p.indication,
       p.target_area,
       COUNT(DISTINCT pp.patient_id) as total_patients,
       AVG(crt.overall_response) as avg_response,
       ROUND(
         CAST(SUM(CASE WHEN pp.status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(DISTINCT pp.patient_id) * 100,
         1
       ) as completion_rate,
       ROUND(
         CAST(COUNT(DISTINCT ae.patient_id) AS FLOAT) / COUNT(DISTINCT pp.patient_id) * 100,
         1
       ) as adverse_effect_rate
     FROM tms_protocols p
     LEFT JOIN tms_patient_profiles pp ON p.id = pp.protocol_id
     LEFT JOIN clinical_response_tracking crt ON pp.patient_id = crt.patient_id
     LEFT JOIN adverse_effects ae ON pp.patient_id = ae.patient_id
     WHERE p.clinic_id = ?
     GROUP BY p.id, p.name, p.indication, p.target_area
     ORDER BY total_patients DESC`
  ).bind(clinicId).all<ProtocolEfficiency>();
  return results;
}

export async function getActivePatientsCount(env: Env, clinicId: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tms_patient_profiles WHERE clinic_id = ? AND status = 'active'`
  ).bind(clinicId).first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getSessionsTodayCount(env: Env, clinicId: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tms_sessions ts
     JOIN tms_patient_profiles pp ON ts.profile_id = pp.id
     WHERE pp.clinic_id = ? AND ts.completed_at IS NOT NULL AND DATE(ts.completed_at) = DATE('now')`
  ).bind(clinicId).first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getResponseRateStats(env: Env, clinicId: number): Promise<{ improving: number; stable: number; declining: number }> {
  const improving = await env.DB.prepare(
    `SELECT COUNT(DISTINCT pp.patient_id) as count
     FROM tms_patient_profiles pp
     JOIN clinical_response_tracking crt ON pp.patient_id = crt.patient_id
     WHERE pp.clinic_id = ? AND pp.status = 'active'
     GROUP BY pp.patient_id
     HAVING MAX(crt.overall_response) > MIN(crt.overall_response) AND
            (SELECT overall_response FROM clinical_response_tracking WHERE patient_id = pp.patient_id ORDER BY created_at DESC LIMIT 1) >
            (SELECT overall_response FROM clinical_response_tracking WHERE patient_id = pp.patient_id ORDER BY created_at ASC LIMIT 1)`
  ).bind(clinicId).first<{ count: number }>();

  const stable = await env.DB.prepare(
    `SELECT COUNT(DISTINCT pp.patient_id) as count
     FROM tms_patient_profiles pp
     JOIN clinical_response_tracking crt ON pp.patient_id = crt.patient_id
     WHERE pp.clinic_id = ? AND pp.status = 'active'
     GROUP BY pp.patient_id
     HAVING MAX(crt.overall_response) - MIN(crt.overall_response) <= 1`
  ).bind(clinicId).first<{ count: number }>();

  const declining = await env.DB.prepare(
    `SELECT COUNT(DISTINCT pp.patient_id) as count
     FROM tms_patient_profiles pp
     JOIN clinical_response_tracking crt ON pp.patient_id = crt.patient_id
     WHERE pp.clinic_id = ? AND pp.status = 'active'
     GROUP BY pp.patient_id
     HAVING (SELECT overall_response FROM clinical_response_tracking WHERE patient_id = pp.patient_id ORDER BY created_at DESC LIMIT 1) <
            (SELECT overall_response FROM clinical_response_tracking WHERE patient_id = pp.patient_id ORDER BY created_at ASC LIMIT 1)`
  ).bind(clinicId).first<{ count: number }>();

  return {
    improving: improving?.count ?? 0,
    stable: stable?.count ?? 0,
    declining: declining?.count ?? 0,
  };
}

export async function getProtocolDistribution(env: Env, clinicId: number): Promise<{ indication: string; count: number }[]> {
  const { results } = await env.DB.prepare(
    `SELECT p.indication, COUNT(pp.id) as count
     FROM tms_protocols p
     JOIN tms_patient_profiles pp ON p.id = pp.protocol_id
     WHERE pp.clinic_id = ? AND pp.status = 'active'
     GROUP BY p.indication ORDER BY count DESC`
  ).bind(clinicId).all<{ indication: string; count: number }>();
  return results;
}

export async function insertAssessment(env: Env, data: {
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  assessment_type: string;
  score: number;
  max_score: number;
  interpretation: string;
  administered_at: string;
}): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO clinical_assessments (clinic_id, patient_id, therapist_id, assessment_type, score, max_score, interpretation, administered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(data.clinic_id, data.patient_id, data.therapist_id, data.assessment_type, data.score, data.max_score, data.interpretation, data.administered_at).run();
  return result.meta?.last_row_id as number;
}

export async function getAssessmentsByPatient(env: Env, patientId: number): Promise<ClinicalAssessment[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, patient_id, assessment_type, score, max_score, administered_at
     FROM clinical_assessments WHERE patient_id = ? ORDER BY administered_at DESC`
  ).bind(patientId).all<ClinicalAssessment>();
  return results;
}

export async function getAssessmentsByType(env: Env, patientId: number, assessmentType: string): Promise<ClinicalAssessment[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, patient_id, assessment_type, score, max_score, administered_at
     FROM clinical_assessments WHERE patient_id = ? AND assessment_type = ? ORDER BY administered_at DESC`
  ).bind(patientId, assessmentType).all<ClinicalAssessment>();
  return results;
}
