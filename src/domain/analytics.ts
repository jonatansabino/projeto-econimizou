import { categoryTotals, filterTransactions, periodRange, transactionTotals, type TransactionFilters } from './features.ts';
import type { Category, Transaction } from './finance.ts';

export const chartColors = { income: '#34D399', expense: '#FB7185', balance: '#60A5FA' };
const palette = ['#34D399', '#60A5FA', '#FBBF24', '#A78BFA', '#FB7185', '#22D3EE', '#FB923C', '#818CF8'];
export function categoryColor(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
export function reportRange(mode: string, month: string, year: string, now = new Date()): Pick<TransactionFilters, 'start' | 'end'> {
  if (mode === 'selectedMonth') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.');
    const [y, m] = month.split('-').map(Number);
    return { start: `${month}-01`, end: `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}` };
  }
  if (mode === 'year') {
    if (!/^\d{4}$/.test(year) || Number(year) < 1900) throw new Error('Ano inválido.');
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return periodRange(mode, now);
}
export function availablePeriods(transactions: Transaction[], today: string) {
  const months = [...new Set([today.slice(0, 7), ...transactions.map((item) => item.date.slice(0, 7))])].sort().reverse();
  return { months, years: [...new Set(months.map((month) => month.slice(0, 4)))] };
}
export function monthLabel(month: string) { return month.split('-').reverse().join('/'); }
function monthIndex(month: string) { const [year, number] = month.split('-').map(Number); return year * 12 + number - 1; }
function monthKey(index: number) { return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`; }
export function financialReport(transactions: Transaction[], categories: Category[], range: Pick<TransactionFilters, 'start' | 'end'> = {}) {
  const selected = filterTransactions(transactions, range);
  const totals = transactionTotals(selected);
  const segments = categoryTotals(selected, categories).map((item) => ({ ...item, color: categoryColor(item.id), percent: item.total / totals.expenseCents * 100 }));
  const dates = transactions.map((item) => item.date).sort();
  const start = range.start?.slice(0, 7) ?? dates[0]?.slice(0, 7);
  const end = range.end?.slice(0, 7) ?? dates.at(-1)?.slice(0, 7);
  const monthly: { month: string; incomeCents: number; expenseCents: number; balanceCents: number; netCents: number }[] = [];
  if (start && end) {
    const movement = new Map<string, { income: number; expense: number }>();
    for (const item of selected) {
      const month = item.date.slice(0, 7);
      const values = movement.get(month) ?? { income: 0, expense: 0 };
      values[item.type] += item.amountCents; movement.set(month, values);
    }
    let balance = 0;
    const history = new Map<string, number>();
    for (const item of transactions) {
      if (range.end && item.date > range.end) continue;
      const signed = item.type === 'income' ? item.amountCents : -item.amountCents;
      const month = item.date.slice(0, 7);
      if (month < start) balance += signed;
      else history.set(month, (history.get(month) ?? 0) + signed);
    }
    for (let index = monthIndex(start); index <= monthIndex(end); index++) {
      const month = monthKey(index);
      balance += history.get(month) ?? 0;
      const values = movement.get(month) ?? { income: 0, expense: 0 };
      monthly.push({ month, incomeCents: values.income, expenseCents: values.expense, netCents: values.income - values.expense, balanceCents: balance });
    }
  }
  return { transactions: selected, ...totals, segments, monthly };
}
export type FinancialReport = ReturnType<typeof financialReport>;

// Mesmo acerto de fatia em Android, iOS e web, usando coordenadas locais do toque.
export function pieSegmentAt(x: number, y: number, radius: number, innerRadius: number, values: number[]) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
  const distance = Math.hypot(x, y);
  if (distance > radius || distance < innerRadius) return -1;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return -1;
  const angle = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  let end = 0;
  for (let index = 0; index < values.length; index++) {
    end += values[index] / total * Math.PI * 2;
    if (angle < end) return index;
  }
  return values.length - 1;
}
