export { TodayEngine } from './engine/TodayEngine';
export { ClinicalFlowEngine } from './engine/ClinicalFlowEngine';
export { SessionOrchestrator } from './engine/SessionOrchestrator';
export { TaskEngine } from './engine/TaskEngine';
export { AlertEngine } from './engine/AlertEngine';
export { PatientStateMachine } from './engine/PatientStateMachine';

export { todayService } from './services/today.service';
export { clinicalFlowService } from './services/clinicalFlow.service';
export { sessionService } from './services/session.service';
export { taskService } from './services/task.service';
export { alertService } from './services/alert.service';

export {
  selectDaySummary,
  selectWaitingCount,
  selectInSessionCount,
  selectCompletedCount,
  selectCompletionRate,
  selectNoShowRate,
  selectNextPatient,
  selectPatientsAvailable,
} from './selectors/today.selector';

export {
  selectStateDistribution,
  selectNeedsAttention,
  selectActiveTreatment,
  selectAverageProgress,
  selectJourneySummary,
} from './selectors/patientJourney.selector';

export {
  selectTaskStats,
  selectUrgentTasks,
  selectCriticalAlerts,
  selectAlertsRequiringAction,
  selectOperationalSummary,
} from './selectors/clinicalSummary.selector';

export type { ClinicalState, ClinicalAction } from './models/clinical-state';
export type { ClinicalTask, TaskType, TaskPriority } from './models/task';
export type { SessionContext, SessionResult, SessionTimeline } from './models/session';
export type { ClinicalAlert, AlertSeverity, AlertCategory } from './models/alert';
export type { PatientClinicalProfile } from './engine/PatientStateMachine';
export type { TodayOverview } from './engine/TodayEngine';
export type { NextActionResult } from './engine/ClinicalFlowEngine';
