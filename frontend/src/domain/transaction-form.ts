import { normalize, parseDate, parseMoney } from './features.ts';
import type { Category, TransactionInput, TransactionType } from './finance.ts';

export type TransactionDraft = { type: TransactionType; description: string; value: string; date: string; categoryId: string };
export type DraftErrors = Partial<Record<keyof TransactionDraft, string>>;

// Digitação em centavos: 1 → R$ 0,01; 123456 → R$ 1.234,56.
export function maskMoney(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 16);
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const whole = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${whole},${padded.slice(-2)}`;
}
export function validateDraft(draft: TransactionDraft, categories: Category[]): { errors: DraftErrors; input?: TransactionInput } {
  const errors: DraftErrors = {};
  let amountCents = 0; let date = '';
  if (!draft.description.trim()) errors.description = 'Informe a descrição da Transação.';
  try { amountCents = parseMoney(draft.value); } catch { errors.value = 'Informe um valor maior que zero, em reais.'; }
  try { date = parseDate(draft.date); } catch { errors.date = 'Informe uma data válida no formato DD/MM/AAAA.'; }
  if (!categories.some((category) => category.id === draft.categoryId && category.type === draft.type)) errors.categoryId = 'Selecione uma categoria compatível.';
  return { errors, ...(Object.keys(errors).length ? {} : { input: { description: draft.description.trim(), amountCents, date, type: draft.type, categoryId: draft.categoryId } }) };
}
export function categoryIcon(name: string, type: TransactionType): 'restaurant-outline' | 'home-outline' | 'car-outline' | 'game-controller-outline' | 'school-outline' | 'medkit-outline' | 'cash-outline' | 'pricetag-outline' {
  const key = normalize(name);
  if (/aliment|comida|mercado/.test(key)) return 'restaurant-outline';
  if (/moradia|casa|aluguel/.test(key)) return 'home-outline';
  if (/transporte|carro/.test(key)) return 'car-outline';
  if (/lazer|cinema/.test(key)) return 'game-controller-outline';
  if (/educa|curso/.test(key)) return 'school-outline';
  if (/saude/.test(key)) return 'medkit-outline';
  return type === 'income' ? 'cash-outline' : 'pricetag-outline';
}

export function calendarDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const count = new Date(year, month, 0).getDate();
  return [...Array<null>(first.getDay()).fill(null), ...Array.from({ length: count }, (_, index) => `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)];
}
