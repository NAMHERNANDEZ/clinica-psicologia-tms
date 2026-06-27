import type { ExportOptions } from './types';

export interface ReportGenerateInput {
  patient_id: number;
  format?: 'pdf' | 'csv';
  sections?: string[];
  date_range?: { from: string; to: string };
}

export function validateReportGenerateInput(input: unknown): { valid: boolean; errors: string[]; data?: ReportGenerateInput } {
  const errors: string[] = [];
  const data = input as Partial<ReportGenerateInput>;

  if (data.patient_id === undefined || data.patient_id === null) {
    errors.push('patient_id is required');
  } else if (typeof data.patient_id !== 'number' || !Number.isInteger(data.patient_id)) {
    errors.push('patient_id must be an integer');
  }

  if (data.format !== undefined && data.format !== null) {
    if (data.format !== 'pdf' && data.format !== 'csv') {
      errors.push('format must be pdf or csv');
    }
  }

  if (data.sections !== undefined && data.sections !== null) {
    if (!Array.isArray(data.sections)) {
      errors.push('sections must be an array');
    } else {
      const validSections = ['summary', 'scores', 'timeline', 'adverse_effects', 'predictions', 'protocol'];
      for (const s of data.sections) {
        if (typeof s !== 'string' || !validSections.includes(s)) {
          errors.push(`invalid section: ${s}. valid options: ${validSections.join(', ')}`);
        }
      }
    }
  }

  if (data.date_range !== undefined && data.date_range !== null) {
    if (typeof data.date_range !== 'object') {
      errors.push('date_range must be an object');
    } else {
      if (!data.date_range.from) errors.push('date_range.from is required');
      if (!data.date_range.to) errors.push('date_range.to is required');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      patient_id: data.patient_id!,
      format: data.format as 'pdf' | 'csv' | undefined,
      sections: data.sections,
      date_range: data.date_range,
    },
  };
}
