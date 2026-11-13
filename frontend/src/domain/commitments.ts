import { isCivilDate } from './civil-date.ts';
import type { Category, FinanceData, Transaction } from './finance.ts';

export type CommitmentType = 'payable' | 'receivable';
export type CommitmentInput = { type: CommitmentType; description: string; categoryId: string; amountCents: number; dueDate: string; notes: string };
export type Commitment = CommitmentInput & { id: string; status: 'pending' | 'settled'; actualDate?: string; actualAmountCents?: number; transactionId?: string; recurrenceId?: string; occurrenceMonth?: string; createdAt: string; updatedAt: string };
export type CommitmentRecurrence = CommitmentInput & { id: string; active: boolean; generatedThrough: string; createdAt: string; updatedAt: string };
export const transactionType = (type: CommitmentType) => type === 'payable' ? 'expense' as const : 'income' as const;
export const commitmentStatus = (bill: Commitment, today: string) => bill.status === 'settled' ? 'settled' : bill.dueDate < today ? 'overdue' : 'pending';
export function statusLabel(bill: Commitment, today: string) {
  const status = commitmentStatus(bill, today);
  return status === 'settled' ? bill.type === 'payable' ? 'Paga' : 'Recebido' : status === 'overdue' ? bill.type === 'payable' ? 'Atrasada' : 'Atrasado' : 'Pendente';
}
export function validCents(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
export function safeSum(values: number[]) {
  let total = 0;
  for (const value of values) { total += value; if (!Number.isSafeInteger(total)) throw new Error('Total de compromissos fora do limite suportado.'); }
  return total;
}
export function validateCommitmentInput(input: CommitmentInput, categories: Category[]) {
  if (!input || !['payable', 'receivable'].includes(input.type) || typeof input.description !== 'string' || !input.description.trim() || input.description.length > 120 || !validCents(input.amountCents) || !isCivilDate(input.dueDate) || typeof input.notes !== 'string' || input.notes.length > 1000 || !categories.some(c => c.id === input.categoryId && c.type === transactionType(input.type))) throw new Error('Compromisso inválido. Confira descrição, categoria, valor e vencimento.');
}
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  const total = year * 12 + number - 1 + delta;
  return `${Math.floor(total / 12)}-${String(total % 12 + 1).padStart(2, '0')}`;
}
export function monthlyDueDate(anchor: string, month: string) {
  const [year, number] = month.split('-').map(Number);
  return `${month}-${String(Math.min(Number(anchor.slice(-2)), new Date(year, number, 0).getDate())).padStart(2, '0')}`;
}
// Um cursor durável impede recriar ocorrências excluídas, sem gerar transações.
// Expande até 12 meses à frente, desde a primeira ocorrência, com IDs determinísticos.
export function materializeCommitments(data: FinanceData, today: string, now: string): FinanceData {
  const commitments = [...(data.commitments ?? [])];
  let changed = false;
  const recurrences = (data.commitmentRecurrences ?? []).map(rule => {
    if (!rule.active) return rule;
    const horizon = shiftMonth((today > rule.dueDate ? today : rule.dueDate).slice(0, 7), 11);
    const end = horizon.length > 7 || horizon > '9999-12' ? '9999-12' : horizon;
    let month = rule.generatedThrough ? shiftMonth(rule.generatedThrough, 1) : rule.dueDate.slice(0, 7);
    while (month.length === 7 && month <= end) {
      const id = `${rule.id}:${month}`;
      if (!commitments.some(item => item.id === id || (item.recurrenceId === rule.id && item.occurrenceMonth === month))) commitments.push({ id, type: rule.type, description: rule.description, categoryId: rule.categoryId, amountCents: rule.amountCents, notes: rule.notes, dueDate: monthlyDueDate(rule.dueDate, month), status: 'pending', recurrenceId: rule.id, occurrenceMonth: month, createdAt: now, updatedAt: now });
      month = shiftMonth(month, 1); changed = true;
    }
    return changed && rule.generatedThrough < end ? { ...rule, generatedThrough: end, updatedAt: now } : rule;
  });
  return changed ? { ...data, commitments, commitmentRecurrences: recurrences } : data;
}
export function validateCommitments(data: FinanceData) {
  const bills = data.commitments ?? [], rules = data.commitmentRecurrences ?? [];
  if (!Array.isArray(bills) || !Array.isArray(rules)) throw new Error('Compromissos inválidos.');
  const ids = new Set<string>(), txIds = new Set<string>(), occurrences = new Set<string>();
  const stamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  for (const rule of rules) {
    validateCommitmentInput(rule, data.categories);
    if (typeof rule.id !== 'string' || !rule.id.trim() || ids.has(rule.id) || typeof rule.active !== 'boolean' || !monthPattern.test(rule.generatedThrough) || rule.generatedThrough < rule.dueDate.slice(0, 7) || !stamp(rule.createdAt) || !stamp(rule.updatedAt)) throw new Error('Recorrência inválida.');
    ids.add(rule.id);
  }
  ids.clear();
  for (const bill of bills) {
    validateCommitmentInput(bill, data.categories);
    if (typeof bill.id !== 'string' || !bill.id.trim() || ids.has(bill.id) || !['pending', 'settled'].includes(bill.status) || !stamp(bill.createdAt) || !stamp(bill.updatedAt)) throw new Error('Compromisso inválido.');
    ids.add(bill.id);
    if (bill.recurrenceId) {
      const key = `${bill.recurrenceId}:${bill.occurrenceMonth}`;
      if (!rules.some(rule => rule.id === bill.recurrenceId) || !monthPattern.test(bill.occurrenceMonth ?? '') || occurrences.has(key)) throw new Error('Ocorrência recorrente inválida ou duplicada.');
      occurrences.add(key);
    }
    if (bill.status === 'pending') {
      if (bill.transactionId !== undefined || bill.actualDate !== undefined || bill.actualAmountCents !== undefined) throw new Error('Conta pendente não pode ter movimentação efetiva.');
    } else {
      const tx = data.transactions.find(tx => tx.id === bill.transactionId);
      if (!tx || txIds.has(tx.id) || tx.commitmentId !== bill.id || tx.type !== transactionType(bill.type) || tx.date !== bill.actualDate || tx.amountCents !== bill.actualAmountCents) throw new Error('Vínculo entre compromisso e Transação inválido.');
      txIds.add(tx.id);
    }
  }
  for (const tx of data.transactions) if (tx.commitmentId !== undefined && !bills.some(bill => bill.id === tx.commitmentId && bill.transactionId === tx.id && bill.status === 'settled')) throw new Error('Transação sem compromisso correspondente.');
  safeSum([...data.transactions.map(t => t.amountCents), ...bills.map(b => b.amountCents)]);
}
export function commitmentSummary(bills: Commitment[], type: CommitmentType, month: string, today: string) {
  const selected = bills.filter(b => b.type === type);
  const pending = selected.filter(b => b.status === 'pending' && (!month || b.dueDate.startsWith(month)));
  const settled = selected.filter(b => b.status === 'settled' && (!month || b.actualDate?.startsWith(month)));
  return { pendingCents: safeSum(pending.map(b => b.amountCents)), overdueCents: safeSum(pending.filter(b => b.dueDate < today).map(b => b.amountCents)), settledCents: safeSum(settled.map(b => b.actualAmountCents!)) };
}
export function projectedBalance(balance: number, bills: Commitment[], from: string, until: string) {
  const pending = bills.filter(b => b.status === 'pending' && b.dueDate >= from && b.dueDate <= until);
  return safeSum([balance, ...pending.map(b => b.type === 'receivable' ? b.amountCents : -b.amountCents)]);
}
export function linkedCommitment(bills: Commitment[] | undefined, tx: Transaction) { return bills?.find(bill => bill.id === tx.commitmentId); }
