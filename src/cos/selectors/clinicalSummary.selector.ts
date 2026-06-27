import type { ClinicalTask } from '../models/task';
import type { ClinicalAlert } from '../models/alert';

export function selectTasksByPriority(tasks: ClinicalTask[], priority: string): ClinicalTask[] {
  return tasks.filter(t => t.priority === priority);
}

export function selectTasksByType(tasks: ClinicalTask[], type: string): ClinicalTask[] {
  return tasks.filter(t => t.type === type);
}

export function selectUrgentTasks(tasks: ClinicalTask[]): ClinicalTask[] {
  return tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
}

export function selectTaskStats(tasks: ClinicalTask[]) {
  return {
    total: tasks.length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
}

export function selectCriticalAlerts(alerts: ClinicalAlert[]): ClinicalAlert[] {
  return alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency');
}

export function selectAlertsRequiringAction(alerts: ClinicalAlert[]): ClinicalAlert[] {
  return alerts.filter(a => a.action_required && !a.dismissed);
}

export function selectClinicalAlerts(alerts: ClinicalAlert[]): ClinicalAlert[] {
  return alerts.filter(a => a.category === 'clinical');
}

export function selectSafetyAlerts(alerts: ClinicalAlert[]): ClinicalAlert[] {
  return alerts.filter(a => a.category === 'safety');
}

export function selectOperationalSummary(tasks: ClinicalTask[], alerts: ClinicalAlert[]) {
  return {
    tasks: selectTaskStats(tasks),
    critical_alerts: selectCriticalAlerts(alerts).length,
    action_required: selectAlertsRequiringAction(alerts).length,
    safety_alerts: selectSafetyAlerts(alerts).length,
  };
}
