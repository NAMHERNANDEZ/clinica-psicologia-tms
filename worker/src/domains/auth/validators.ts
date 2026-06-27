export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  clinic_name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateRegister(data: unknown): { valid: true; data: RegisterInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.email || typeof input.email !== 'string') return { valid: false, error: 'Email requerido' };
  if (!input.password || typeof input.password !== 'string') return { valid: false, error: 'Password requerido' };
  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'Nombre requerido' };
  if (!input.clinic_name || typeof input.clinic_name !== 'string') return { valid: false, error: 'Nombre de clínica requerido' };

  if (input.password.length < 8) return { valid: false, error: 'Mínimo 8 caracteres' };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) return { valid: false, error: 'Email inválido' };

  return { valid: true, data: input as RegisterInput };
}

export function validateLogin(data: unknown): { valid: true; data: LoginInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.email || typeof input.email !== 'string') return { valid: false, error: 'Email requerido' };
  if (!input.password || typeof input.password !== 'string') return { valid: false, error: 'Password requerido' };

  return { valid: true, data: input as LoginInput };
}
