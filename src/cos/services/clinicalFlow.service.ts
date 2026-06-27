import { ClinicalFlowEngine } from '../engine/ClinicalFlowEngine';

const flowEngine = new ClinicalFlowEngine();

export const clinicalFlowService = {
  getNextAction: (patientId: number) => flowEngine.getNextAction(patientId),
  getPatientProfile: (patientId: number) => flowEngine.getPatientProfile(patientId),
  getAllPatientStates: () => flowEngine.getAllPatientStates(),
  determineState: (patientId: number) => flowEngine.determineState(patientId),
};
