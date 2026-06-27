export type TemplateType = 'whatsapp' | 'email';

export interface TemplateInput {
  name: string;
  content: string;
  type: TemplateType;
  is_default?: boolean;
}

export function validateTemplate(data: unknown): { valid: true; data: TemplateInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'Nombre requerido' };
  if (!input.content || typeof input.content !== 'string') return { valid: false, error: 'Contenido requerido' };
  if (!input.type || typeof input.type !== 'string') return { valid: false, error: 'Tipo requerido' };
  if (input.type !== 'whatsapp' && input.type !== 'email') return { valid: false, error: 'Tipo inválido, debe ser whatsapp o email' };
  if (input.name.length < 2) return { valid: false, error: 'Nombre muy corto' };
  if (input.content.length < 1) return { valid: false, error: 'Contenido vacío' };
  return { valid: true, data: input as TemplateInput };
}
