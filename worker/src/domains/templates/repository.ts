import type { Env } from '../../types';
import type { TemplateType } from './validators';

export interface MessageTemplate {
  id: number;
  clinic_id: number;
  name: string;
  content: string;
  type: string;
  is_default: number;
  created_at: string;
}

export async function findTemplatesByClinic(env: Env, clinicId: number): Promise<MessageTemplate[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, name, content, type, is_default, created_at FROM message_templates WHERE clinic_id = ? ORDER BY created_at DESC"
  ).bind(clinicId).all();
  return result.results as unknown as MessageTemplate[];
}

export async function findTemplateById(env: Env, id: number): Promise<MessageTemplate | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, name, content, type, is_default, created_at FROM message_templates WHERE id = ?"
  ).bind(id).first();
  return (row as unknown as MessageTemplate) || null;
}

export async function findDefaultByType(env: Env, clinicId: number, type: TemplateType): Promise<MessageTemplate | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, name, content, type, is_default, created_at FROM message_templates WHERE clinic_id = ? AND type = ? AND is_default = 1"
  ).bind(clinicId, type).first();
  return (row as unknown as MessageTemplate) || null;
}

export async function createTemplate(env: Env, clinicId: number, name: string, content: string, type: TemplateType, isDefault: boolean): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO message_templates (clinic_id, name, content, type, is_default) VALUES (?, ?, ?, ?, ?)"
  ).bind(clinicId, name, content, type, isDefault ? 1 : 0).run();
  return result.meta.last_row_id as number;
}

export async function updateTemplate(env: Env, id: number, name: string, content: string, type: TemplateType, isDefault: boolean): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE message_templates SET name = ?, content = ?, type = ?, is_default = ? WHERE id = ?"
  ).bind(name, content, type, isDefault ? 1 : 0, id).run();
  return result.meta.changes > 0;
}

export async function deleteTemplate(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM message_templates WHERE id = ?"
  ).bind(id).run();
  return result.meta.changes > 0;
}

export async function setDefaultTemplate(env: Env, clinicId: number, type: TemplateType, templateId: number): Promise<void> {
  await env.DB.prepare(
    "UPDATE message_templates SET is_default = 0 WHERE clinic_id = ? AND type = ? AND is_default = 1"
  ).bind(clinicId, type).run();
  await env.DB.prepare(
    "UPDATE message_templates SET is_default = 1 WHERE id = ?"
  ).bind(templateId).run();
}
