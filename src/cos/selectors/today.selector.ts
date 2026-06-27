import type { Appointment } from '../../lib/api';
import type { TodayOverview } from '../engine/TodayEngine';

export function selectWaitingCount(overview: TodayOverview): number {
  return overview.waiting.length;
}

export function selectInSessionCount(overview: TodayOverview): number {
  return overview.in_session.length;
}

export function selectCompletedCount(overview: TodayOverview): number {
  return overview.completed.length;
}

export function selectCancelledCount(overview: TodayOverview): number {
  return overview.cancelled.length;
}

export function selectNoShowCount(overview: TodayOverview): number {
  return overview.no_show.length;
}

export function selectCompletionRate(overview: TodayOverview): number {
  if (overview.total_appointments === 0) return 0;
  return Math.round((overview.completed.length / overview.total_appointments) * 100);
}

export function selectNoShowRate(overview: TodayOverview): number {
  if (overview.total_appointments === 0) return 0;
  return Math.round((overview.no_show.length / overview.total_appointments) * 100);
}

export function selectNextPatient(overview: TodayOverview): Appointment | null {
  return overview.waiting.length > 0 ? overview.waiting[0] : null;
}

export function selectHasUrgentAlerts(overview: TodayOverview): boolean {
  return overview.urgent_alerts > 0;
}

export function selectPatientsAvailable(overview: TodayOverview): number {
  return overview.patients_without_appointment.length;
}

export function selectDaySummary(overview: TodayOverview) {
  return {
    date: overview.date,
    total: overview.total_appointments,
    waiting: selectWaitingCount(overview),
    in_session: selectInSessionCount(overview),
    completed: selectCompletedCount(overview),
    completion_rate: selectCompletionRate(overview),
    no_show_rate: selectNoShowRate(overview),
    next_patient: selectNextPatient(overview),
    patients_available: selectPatientsAvailable(overview),
  };
}
