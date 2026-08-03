export interface DashboardMetrics {
  leads: {
    today: number;
    month: number;
    by_status: Record<string, number>;
  };
  appointments: {
    today: {
      total: number;
      by_status: Record<string, number>;
    };
    month: {
      total: number;
      by_status: Record<string, number>;
    };
  };
  automation: {
    today: number;
    week: number;
    by_channel: Record<string, number>;
    by_status: Record<string, number>;
  };
  conversion: {
    leads_month: number;
    appointments_from_leads: number;
    rate_percentage: number;
  };
}

export type DashboardStatus = 'pending' | 'processing' | 'sent' | 'failed';
