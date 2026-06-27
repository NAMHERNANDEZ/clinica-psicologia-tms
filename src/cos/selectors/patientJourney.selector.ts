import type { PatientClinicalProfile } from '../engine/PatientStateMachine';
import type { ClinicalState } from '../models/clinical-state';

export function selectPatientById(profiles: PatientClinicalProfile[], patientId: number): PatientClinicalProfile | undefined {
  return profiles.find(p => p.patient_id === patientId);
}

export function selectPatientsByState(profiles: PatientClinicalProfile[], state: ClinicalState): PatientClinicalProfile[] {
  return profiles.filter(p => p.clinical_state === state);
}

export function selectStateDistribution(profiles: PatientClinicalProfile[]) {
  const dist: Record<ClinicalState, number> = {
    REGISTERED: 0,
    EVALUATED: 0,
    MT_MEASURED: 0,
    PROTOCOL_ASSIGNED: 0,
    IN_TREATMENT: 0,
    UNDER_OBSERVATION: 0,
    DISCHARGED: 0,
  };

  for (const p of profiles) {
    dist[p.clinical_state]++;
  }

  return dist;
}

export function selectNeedsAttention(profiles: PatientClinicalProfile[]): PatientClinicalProfile[] {
  return profiles.filter(p =>
    p.next_action === 'EVALUATION_REQUIRED' ||
    p.next_action === 'MT_MEASUREMENT_REQUIRED' ||
    p.next_action === 'ASSIGN_TMS_PROTOCOL'
  );
}

export function selectActiveTreatment(profiles: PatientClinicalProfile[]): PatientClinicalProfile[] {
  return profiles.filter(p => p.clinical_state === 'IN_TREATMENT');
}

export function selectAverageProgress(profiles: PatientClinicalProfile[]): number {
  if (profiles.length === 0) return 0;
  const total = profiles.reduce((sum, p) => sum + p.workflow_progress, 0);
  return Math.round(total / profiles.length);
}

export function selectJourneySummary(profiles: PatientClinicalProfile[]) {
  const dist = selectStateDistribution(profiles);
  return {
    total: profiles.length,
    distribution: dist,
    needs_attention: selectNeedsAttention(profiles).length,
    active_treatment: selectActiveTreatment(profiles).length,
    average_progress: selectAverageProgress(profiles),
    discharged: dist.DISCHARGED,
  };
}
