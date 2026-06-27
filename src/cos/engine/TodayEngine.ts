import { patients, appointments, tmsProfiles } from '../../lib/api';
import type { Appointment, Patient, TmsProfile } from '../../lib/api';

export interface TodayOverview {
  date: string;
  total_appointments: number;
  waiting: Appointment[];
  in_session: Appointment[];
  completed: Appointment[];
  cancelled: Appointment[];
  no_show: Appointment[];
  patients_without_appointment: Patient[];
  urgent_alerts: number;
}

export class TodayEngine {
  async getTodayOverview(date: string, _clinicId?: number): Promise<TodayOverview> {
    const [apptsRes, patientsRes] = await Promise.allSettled([
      appointments.list({ date }),
      patients.list(),
    ]);

    const allAppointments = apptsRes.status === 'fulfilled' ? (apptsRes.value.data || []) : [];
    const allPatients = patientsRes.status === 'fulfilled' ? (patientsRes.value.data || []) : [];

    const patientsWithAppt = new Set(allAppointments.map((a: Appointment) => a.patient_id));
    const patientsWithoutAppt = allPatients.filter((p: Patient) => !patientsWithAppt.has(p.id));

    return {
      date,
      total_appointments: allAppointments.length,
      waiting: allAppointments.filter((a: Appointment) => a.status === 'scheduled'),
      in_session: allAppointments.filter((a: Appointment) => !['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'].includes(a.status as string)),
      completed: allAppointments.filter((a: Appointment) => a.status === 'completed'),
      cancelled: allAppointments.filter((a: Appointment) => a.status === 'cancelled'),
      no_show: allAppointments.filter((a: Appointment) => a.status === 'no_show'),
      patients_without_appointment: patientsWithoutAppt,
      urgent_alerts: 0,
    };
  }

  async getPatientDayContext(patientId: number) {
    const today = new Date().toISOString().split('T')[0];

    const [apptsRes, profilesRes] = await Promise.allSettled([
      appointments.list({ date: today }),
      tmsProfiles.listByPatient(patientId),
    ]);

    const todayAppointments = apptsRes.status === 'fulfilled'
      ? (apptsRes.value.data || []).filter((a: Appointment) => a.patient_id === patientId)
      : [];

    const activeProfiles = profilesRes.status === 'fulfilled'
      ? (profilesRes.value.data || []).filter((p: TmsProfile) => p.status === 'active')
      : [];

    return {
      patient_id: patientId,
      today_appointments: todayAppointments,
      active_tms_profiles: activeProfiles,
      has_session_today: todayAppointments.some((a: Appointment) => a.status === 'scheduled'),
      next_session: todayAppointments.find((a: Appointment) => a.status === 'scheduled'),
    };
  }

  async getOperationalMetrics(clinicId: number) {
    const today = new Date().toISOString().split('T')[0];
    const overview = await this.getTodayOverview(today, clinicId);

    const completionRate = overview.total_appointments > 0
      ? Math.round((overview.completed.length / overview.total_appointments) * 100)
      : 0;

    const noShowRate = overview.total_appointments > 0
      ? Math.round((overview.no_show.length / overview.total_appointments) * 100)
      : 0;

    return {
      date: today,
      total: overview.total_appointments,
      completion_rate: completionRate,
      no_show_rate: noShowRate,
      utilization: overview.in_session.length,
      pending: overview.waiting.length,
      available_patients: overview.patients_without_appointment.length,
    };
  }
}
