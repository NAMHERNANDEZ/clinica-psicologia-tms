import type { ClinicalState, ClinicalAction } from '../models/clinical-state';
import { STATE_TRANSITIONS, canTransition, getNextAction } from '../models/clinical-state';
import { getWorkflowProgress, getRemainingSteps } from '../models/workflow';

export interface PatientClinicalProfile {
  patient_id: number;
  patient_name: string;
  clinical_state: ClinicalState;
  next_action: ClinicalAction;
  workflow_progress: number;
  remaining_steps: string[];
  last_updated: string;
}

export class PatientStateMachine {
  private state: ClinicalState;
  private patientId: number;

  constructor(patientId: number, initialState: ClinicalState = 'REGISTERED') {
    this.patientId = patientId;
    this.state = initialState;
  }

  getCurrentState(): ClinicalState {
    return this.state;
  }

  getPatientId(): number {
    return this.patientId;
  }

  canTransitionTo(target: ClinicalState): boolean {
    return canTransition(this.state, target);
  }

  transition(to: ClinicalState): boolean {
    if (!canTransition(this.state, to)) {
      return false;
    }
    this.state = to;
    return true;
  }

  getNextAction(): ClinicalAction {
    return getNextAction(this.state);
  }

  getValidTransitions(): ClinicalState[] {
    return STATE_TRANSITIONS[this.state];
  }

  getProfile(): PatientClinicalProfile {
    return {
      patient_id: this.patientId,
      patient_name: '',
      clinical_state: this.state,
      next_action: this.getNextAction(),
      workflow_progress: getWorkflowProgress(this.state),
      remaining_steps: getRemainingSteps(this.state).map(s => s.label),
      last_updated: new Date().toISOString(),
    };
  }

  static fromRecord(record: { patient_id: number; clinical_state: ClinicalState }): PatientStateMachine {
    return new PatientStateMachine(record.patient_id, record.clinical_state);
  }
}
