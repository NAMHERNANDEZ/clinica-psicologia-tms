import type { Env } from '../../types';
import type { CreateQualityMetric } from './validators';
import * as repo from './repository';

export async function listMetrics(env: Env, clinicId: number, from?: string | null, to?: string | null) {
  const result = await repo.listMetrics(env, clinicId, from, to);
  return { success: true, data: result.results };
}

export async function getMetric(env: Env, clinicId: number, id: number) {
  const metric = await repo.getMetric(env, clinicId, id);
  if (!metric) return { success: false, error: 'Metric not found', status: 404 };
  return { success: true, data: metric };
}

export async function createMetric(env: Env, clinicId: number, data: CreateQualityMetric) {
  await repo.createMetric(env, clinicId, data);
  return { success: true, message: 'Quality metric recorded' };
}

export async function deleteMetric(env: Env, clinicId: number, id: number) {
  const existing = await repo.getMetric(env, clinicId, id);
  if (!existing) return { success: false, error: 'Metric not found', status: 404 };
  await repo.deleteMetric(env, clinicId, id);
  return { success: true, message: 'Metric deleted' };
}

export async function getSummary(env: Env, clinicId: number) {
  const summary = await repo.getMetricSummary(env, clinicId);
  return { success: true, data: summary };
}

export async function getDashboard(env: Env, clinicId: number) {
  const dashboard = await repo.getDashboardMetrics(env, clinicId);
  return { success: true, data: dashboard };
}
