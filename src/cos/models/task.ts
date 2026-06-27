export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TaskType =
  | 'EVALUATION_DUE'
  | 'MT_MEASUREMENT_DUE'
  | 'PROTOCOL_ASSIGNMENT'
  | 'SESSION_SCHEDULED'
  | 'SESSION_MISSED'
  | 'SESSION_COMPLETED'
  | 'FOLLOW_UP_DUE'
  | 'ADVERSE_EFFECT_REPORT'
  | 'RESPONSE_REVIEW'
  | 'DISCHARGE_REVIEW';

export interface ClinicalTask {
  id: string;
  type: TaskType;
  patient_id: number;
  patient_name?: string;
  therapist_id?: number;
  therapist_name?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  due_time?: string;
  created_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export const TASK_PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  EVALUATION_DUE: 'Evaluación pendiente',
  MT_MEASUREMENT_DUE: 'Medición de umbral motor pendiente',
  PROTOCOL_ASSIGNMENT: 'Asignar protocolo TMS',
  SESSION_SCHEDULED: 'Sesión programada',
  SESSION_MISSED: 'Sesión perdida',
  SESSION_COMPLETED: 'Sesión completada',
  FOLLOW_UP_DUE: 'Seguimiento pendiente',
  ADVERSE_EFFECT_REPORT: 'Reportar efecto adverso',
  RESPONSE_REVIEW: 'Revisar respuesta clínica',
  DISCHARGE_REVIEW: 'Revisión de alta',
};
