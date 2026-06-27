import { TodayEngine } from '../engine/TodayEngine';

const todayEngine = new TodayEngine();

export const todayService = {
  getOverview: (date: string, clinicId: number) => todayEngine.getTodayOverview(date, clinicId),
  getPatientContext: (patientId: number) => todayEngine.getPatientDayContext(patientId),
  getMetrics: (clinicId: number) => todayEngine.getOperationalMetrics(clinicId),
};
