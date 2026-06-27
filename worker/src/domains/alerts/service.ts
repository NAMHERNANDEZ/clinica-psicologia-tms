import type { Env } from '../../types';
import * as repository from './repository';

export async function getAlerts(env: Env, clinicId: number, unreadOnly: boolean = false) {
  return repository.getAlerts(env, clinicId, unreadOnly);
}

export async function getAlertSummary(env: Env, clinicId: number) {
  return repository.getAlertsSummary(env, clinicId);
}

export async function createAlert(
  env: Env,
  clinicId: number,
  data: {
    type: string;
    title: string;
    message: string;
    severity?: string;
    entity?: string;
    entity_id?: number;
  }
) {
  return repository.createAlert(
    env,
    clinicId,
    data.type,
    data.title,
    data.message,
    data.severity ?? 'info',
    data.entity,
    data.entity_id
  );
}

export async function markRead(env: Env, id: number) {
  await repository.markAlertRead(env, id);
}

export async function markAllRead(env: Env, clinicId: number) {
  await repository.markAllRead(env, clinicId);
}

export async function deleteAlert(env: Env, id: number) {
  await repository.deleteAlert(env, id);
}
