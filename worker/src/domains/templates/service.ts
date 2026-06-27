import type { Env } from '../../types';
import type { TemplateType } from './validators';
import * as repo from './repository';

export async function getTemplates(env: Env, clinicId: number) {
  const templates = await repo.findTemplatesByClinic(env, clinicId);
  return { success: true, data: { templates } };
}

export async function createTemplate(env: Env, clinicId: number, data: { name: string; content: string; type: TemplateType; is_default?: boolean }) {
  if (data.is_default) {
    await repo.setDefaultTemplate(env, clinicId, data.type, 0);
    const id = await repo.createTemplate(env, clinicId, data.name, data.content, data.type, true);
    await repo.setDefaultTemplate(env, clinicId, data.type, id);
    return { success: true, data: { id } };
  }
  const id = await repo.createTemplate(env, clinicId, data.name, data.content, data.type, false);
  return { success: true, data: { id } };
}

export async function updateTemplate(env: Env, id: number, data: { name: string; content: string; type: TemplateType; is_default?: boolean }) {
  const existing = await repo.findTemplateById(env, id);
  if (!existing) return { success: false, error: 'Plantilla no encontrada', status: 404 };

  if (data.is_default) {
    await repo.setDefaultTemplate(env, existing.clinic_id, data.type, id);
    await repo.updateTemplate(env, id, data.name, data.content, data.type, true);
  } else {
    await repo.updateTemplate(env, id, data.name, data.content, data.type, false);
  }
  return { success: true, data: null };
}

export async function deleteTemplate(env: Env, id: number) {
  const existing = await repo.findTemplateById(env, id);
  if (!existing) return { success: false, error: 'Plantilla no encontrada', status: 404 };
  await repo.deleteTemplate(env, id);
  return { success: true, data: null };
}

export async function getDefaultTemplate(env: Env, clinicId: number, type: TemplateType) {
  const template = await repo.findDefaultByType(env, clinicId, type);
  if (!template) return { success: false, error: 'No hay plantilla predeterminada', status: 404 };
  return { success: true, data: { template } };
}

export async function renderTemplate(env: Env, templateId: number, variables: Record<string, string>): Promise<{ success: boolean; data?: { content: string }; error?: string; status?: number }> {
  const template = await repo.findTemplateById(env, templateId);
  if (!template) return { success: false, error: 'Plantilla no encontrada', status: 404 };

  let content = template.content;
  content = content.replace(/\{nombre\}/g, variables.nombre || '');
  content = content.replace(/\{fecha\}/g, variables.fecha || '');
  content = content.replace(/\{hora\}/g, variables.hora || '');
  content = content.replace(/\{terapeuta\}/g, variables.terapeuta || '');

  return { success: true, data: { content } };
}
