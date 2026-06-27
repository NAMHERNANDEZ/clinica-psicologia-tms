export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertCategory = 'clinical' | 'operational' | 'safety' | 'compliance';

export interface ClinicalAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  type: string;
  title: string;
  message: string;
  patient_id?: number;
  patient_name?: string;
  session_id?: number;
  action_required: boolean;
  action_label?: string;
  dismissed: boolean;
  created_at: string;
  expires_at?: string;
}

export const ALERT_SEVERITY_CONFIG: Record<AlertSeverity, { color: string; icon: string; label: string }> = {
  info: { color: 'blue', icon: 'info', label: 'Información' },
  warning: { color: 'amber', icon: 'alert-triangle', label: 'Advertencia' },
  critical: { color: 'red', icon: 'alert-circle', label: 'Crítico' },
  emergency: { color: 'red', icon: 'siren', label: 'Emergencia' },
};

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  clinical: 'Clínico',
  operational: 'Operacional',
  safety: 'Seguridad',
  compliance: 'Cumplimiento',
};
