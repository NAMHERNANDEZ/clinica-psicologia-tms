import { AlertEngine } from '../engine/AlertEngine';

const alertEngine = new AlertEngine();

export const alertService = {
  evaluatePatient: (patientId: number) => alertEngine.evaluatePatient(patientId),
  evaluateAll: () => alertEngine.evaluateAllPatients(),
  getStats: (alerts: Parameters<AlertEngine['getAlertStats']>[0]) => alertEngine.getAlertStats(alerts),
};
