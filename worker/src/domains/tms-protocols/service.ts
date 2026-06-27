import type { Env } from '../../types';
import * as repo from './repository';
import type { TmsProtocolInput } from './validators';

export async function getProtocols(env: Env, clinicId: number) {
  const protocols = await repo.findAllByClinic(env, clinicId);
  return { success: true, data: { protocols } };
}

export async function getProtocol(env: Env, id: number) {
  const protocol = await repo.findById(env, id);
  if (!protocol) return { success: false, error: 'Protocolo no encontrado', status: 404 };
  return { success: true, data: { protocol } };
}

export async function createProtocol(env: Env, clinicId: number, data: TmsProtocolInput) {
  const id = await repo.create(env, clinicId, data);
  return { success: true, data: { id } };
}

export async function updateProtocol(env: Env, id: number, data: Partial<TmsProtocolInput>) {
  const existing = await repo.findById(env, id);
  if (!existing) return { success: false, error: 'Protocolo no encontrado', status: 404 };
  const success = await repo.update(env, id, data);
  if (!success) return { success: false, error: 'No se pudo actualizar el protocolo', status: 500 };
  return { success: true, data: null };
}

export async function deactivateProtocol(env: Env, id: number) {
  const existing = await repo.findById(env, id);
  if (!existing) return { success: false, error: 'Protocolo no encontrado', status: 404 };
  const success = await repo.deactivate(env, id);
  if (!success) return { success: false, error: 'No se pudo desactivar el protocolo', status: 500 };
  return { success: true, data: null };
}

export async function suggestProtocol(env: Env, clinicId: number, indication: string, motorThreshold: number) {
  const protocols = await repo.findByIndication(env, clinicId, indication);
  if (protocols.length === 0) {
    return { success: false, error: 'No hay protocolos disponibles para esta indicación', status: 404 };
  }

  const targetIntensity = motorThreshold * 1.2;

  let bestProtocol = protocols[0];
  let bestScore = Infinity;

  for (const protocol of protocols) {
    const intensityDiff = Math.abs(protocol.intensity_pct_mt - targetIntensity);
    const score = intensityDiff;
    if (score < bestScore) {
      bestScore = score;
      bestProtocol = protocol;
    }
  }

  return { success: true, data: { suggested: bestProtocol, alternatives: protocols.filter(p => p.id !== bestProtocol.id) } };
}

export async function getProtocolStats(env: Env, clinicId: number) {
  const stats = await repo.getProtocolStats(env, clinicId);
  return { success: true, data: { stats } };
}
