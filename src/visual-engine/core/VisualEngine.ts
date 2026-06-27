import type { PatientState, ClinicalVisualSnapshot, BrainVisualState, TimelineVisualState, TMSVisualState, TwinVisualState } from './StateMapper';
import { mapStateToBrain } from './ClinicalRenderer';
import { mapStateToTimeline, getTimelineProgress } from './TimelineEngine';

export class VisualEngine {
  mapClinicalStateToVisual(state: PatientState, patientId: number, patientName: string): ClinicalVisualSnapshot {
    return {
      patient_id: patientId,
      patient_name: patientName,
      state,
      brain: mapStateToBrain(state),
      timeline: mapStateToTimeline(state),
      tms: null,
      twin: null,
      hospital: null,
    };
  }

  getBrainAnimation(state: PatientState): BrainVisualState[] {
    return mapStateToBrain(state);
  }

  getTimeline(state: PatientState): TimelineVisualState[] {
    return mapStateToTimeline(state);
  }

  getProgress(state: PatientState): number {
    return getTimelineProgress(state);
  }

  getTMSSessionVisual(state: PatientState, sessionData: { intensity_pct: number; frequency_hz: number; pulses_delivered: number; pulses_total: number; coil_position: string }): TMSVisualState {
    return {
      intensity_pct: sessionData.intensity_pct,
      frequency_hz: sessionData.frequency_hz,
      pulses_total: sessionData.pulses_total,
      pulses_delivered: sessionData.pulses_delivered,
      coil_position: sessionData.coil_position,
      is_active: state === 'IN_TREATMENT',
    };
  }

  getTwinVisual(_state: PatientState, predictions: Array<{ session: number; overall: number }>, actuals: Array<{ session: number; overall: number }>, confidence: number): TwinVisualState {
    const improving = predictions.length >= 2 && predictions[predictions.length - 1].overall > predictions[0].overall;
    const declining = predictions.length >= 2 && predictions[predictions.length - 1].overall < predictions[0].overall;

    return {
      predicted_curve: predictions,
      actual_curve: actuals,
      confidence,
      risk_level: declining ? 0.7 : improving ? 0.2 : 0.4,
      trend: improving ? 'improving' : declining ? 'declining' : 'stable',
    };
  }

  mapStateToUIColor(state: PatientState): { bg: string; text: string; border: string; glow: string } {
    const map: Record<PatientState, { bg: string; text: string; border: string; glow: string }> = {
      REGISTERED: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', glow: 'none' },
      EVALUATED: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd', glow: '0 0 20px rgba(59,130,246,0.3)' },
      MT_MEASURED: { bg: '#f5f3ff', text: '#7c3aed', border: '#c4b5fd', glow: '0 0 20px rgba(124,58,237,0.3)' },
      PROTOCOL_ASSIGNED: { bg: '#fdf2f8', text: '#db2777', border: '#f9a8d4', glow: '0 0 20px rgba(236,72,153,0.3)' },
      IN_TREATMENT: { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4', glow: '0 0 20px rgba(20,184,166,0.3)' },
      UNDER_OBSERVATION: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', glow: '0 0 20px rgba(245,158,11,0.3)' },
      DISCHARGED: { bg: '#f0fdf4', text: '#15803d', border: '#86efac', glow: '0 0 20px rgba(34,197,94,0.3)' },
    };
    return map[state];
  }
}
