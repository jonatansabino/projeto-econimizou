import type { Personalization, ProfileUpdate } from './auth.ts';
import { isCivilDate, localDate } from './finance.ts';
import { maskMoney } from './transaction-form.ts';

export const financialObjectives = [
  { value: 'organize', label: 'Organizar minhas finanças' },
  { value: 'save', label: 'Economizar dinheiro' },
  { value: 'debt_free', label: 'Sair das dívidas' },
  { value: 'achievement', label: 'Juntar dinheiro para uma conquista' },
] as const;
export type PersonalizationDraft = { birth_date: string; financial_objective: string; monthly_income_cents: string };
export function personalizationDraft(profile?: Personalization): PersonalizationDraft {
  return { birth_date: profile?.birth_date ?? '', financial_objective: profile?.financial_objective ?? '', monthly_income_cents: profile?.monthly_income_cents == null ? '' : maskMoney(String(profile.monthly_income_cents)) };
}
export function validatePersonalization(draft: PersonalizationDraft, today = localDate()): { errors: Record<string, string>; input?: ProfileUpdate } {
  const errors: Record<string, string> = {};
  if (draft.birth_date && (!isCivilDate(draft.birth_date) || draft.birth_date < '1900-01-01' || draft.birth_date > today)) errors.birth_date = 'Informe uma data válida, de 1900 até hoje.';
  if (draft.financial_objective && !financialObjectives.some(item => item.value === draft.financial_objective)) errors.financial_objective = 'Escolha um objetivo válido.';
  const cents = draft.monthly_income_cents ? Number(draft.monthly_income_cents.replace(/\D/g, '')) : null;
  if (cents !== null && (!Number.isSafeInteger(cents) || cents < 0 || !/^R\$ [\d.]+,\d{2}$/.test(draft.monthly_income_cents))) errors.monthly_income_cents = 'Informe uma renda válida em reais.';
  if (Object.keys(errors).length) return { errors };
  return { errors, input: { birth_date: draft.birth_date || null, financial_objective: (draft.financial_objective || null) as Personalization['financial_objective'], monthly_income_cents: cents } };
}

// Orientativo: a aprovação final da senha continua sendo do Shield.
export function passwordStrength(password: string) {
  if (!password) return { score: 0, label: 'Não informada' };
  if (password.length < 8 || /^(.)\1+$/.test(password) || /^(12345678|password|senha123)/i.test(password)) return { score: 1, label: 'Fraca' };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter(pattern => pattern.test(password)).length;
  if (password.length >= 12 && variety >= 3) return { score: 4, label: 'Forte' };
  return { score: variety >= 3 ? 3 : 2, label: variety >= 3 ? 'Boa' : 'Razoável' };
}
