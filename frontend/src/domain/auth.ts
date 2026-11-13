import type { FinancialApi } from './remote-finance.ts';
import type { CategoryApi } from './categories.ts';
export type FinancialObjective = 'organize' | 'save' | 'debt_free' | 'achievement';
export type Personalization = { birth_date: string | null; financial_objective: FinancialObjective | null; monthly_income_cents: number | null; completed: boolean };
export type ProfileUpdate = Partial<Pick<AuthUser, 'name' | 'avatar'>> & Partial<Omit<Personalization, 'completed'>> & { personalization_completed?: boolean };
export type AuthUser = { id: string; name: string; email: string; avatar: string; personalization?: Personalization };
export type Credentials = { email: string; password: string };
export type Registration = Credentials & { name: string; password_confirmation: string };
export type AuthResult = { user: AuthUser; access_token?: string; expires_at?: string };
export type AuthSnapshot = { status: 'restoring' | 'signedOut' | 'signedIn' | 'networkError'; user: AuthUser | null; error: string | null };
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}
export interface AuthApi {
  financesForUser?(id: string): FinancialApi;
  categoriesForUser?(id: string): CategoryApi;
  setToken(token: string | null): void;
  me(): Promise<AuthResult>;
  login(credentials: Credentials): Promise<AuthResult>;
  register(registration: Registration): Promise<AuthResult>;
  logout(): Promise<unknown>;
  profile(profile: ProfileUpdate): Promise<AuthResult>;
}
export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;
  constructor(message: string, status = 0, errors: Record<string, string> = {}) { super(message); this.status = status; this.errors = errors; }
}
export function validateAuthUser(value: unknown): asserts value is AuthUser {
  if (!value || typeof value !== 'object' || !['id', 'name', 'email', 'avatar'].every((key) => typeof (value as Record<string, unknown>)[key] === 'string' && (value as Record<string, string>)[key].length > 0)) {
    throw new ApiError('O serviço retornou uma resposta inválida. Tente novamente.');
  }
  const profile = (value as AuthUser).personalization;
  if (profile !== undefined && (!profile || typeof profile !== 'object' || typeof profile.completed !== 'boolean'
    || !(profile.birth_date === null || typeof profile.birth_date === 'string')
    || !(profile.financial_objective === null || ['organize', 'save', 'debt_free', 'achievement'].includes(profile.financial_objective))
    || !(profile.monthly_income_cents === null || Number.isSafeInteger(profile.monthly_income_cents) && profile.monthly_income_cents >= 0))) throw new ApiError('O serviço retornou um perfil inválido. Tente novamente.');
}
export function validateAuthForm(data: Credentials & Partial<Registration>, register: boolean) {
  const errors: Record<string, string> = {};
  if (register && (!data.name?.trim() || data.name.trim().length > 60)) errors.name = 'Informe seu nome, com até 60 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Informe um e-mail válido.';
  if (data.password.length < 8) errors.password = 'A senha precisa ter pelo menos 8 caracteres.';
  else if (Array.from(data.password).reduce((bytes, character) => {
    const point = character.codePointAt(0)!;
    return bytes + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4);
  }, 0) > 72) errors.password = 'A senha ultrapassa o limite de 72 bytes.';
  if (register && (!data.password_confirmation || data.password_confirmation !== data.password)) errors.password_confirmation = 'As senhas precisam ser iguais.';
  return errors;
}
