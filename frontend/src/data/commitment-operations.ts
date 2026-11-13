import { materializeCommitments, monthlyDueDate as materializedDate, transactionType, validCents, validateCommitmentInput, type CommitmentInput } from '../domain/commitments.ts';
import { isCivilDate, localDate, type FinanceData } from '../domain/finance.ts';

type Commit = (update: (data: FinanceData) => FinanceData) => Promise<void>;
// Comandos independentes de UI; o repositório financeiro grava conta + Transação atomicamente.
export function createCommitmentActions(commit: Commit, newId: (prefix: string) => string) {
  const find = (data: FinanceData, id: string) => { const bill = data.commitments?.find(b => b.id === id); if (!bill) throw new Error('Compromisso não encontrado.'); return bill; };
  return {
    saveCommitment(input: CommitmentInput, id?: string, monthly = false, acknowledgeSettled = false) {
      return commit(data => {
        validateCommitmentInput(input, data.categories.filter(c => !c.archived || (id !== undefined && c.id === input.categoryId))); 
        const now = new Date().toISOString(); const bills = data.commitments ?? [];
        if (id) {
          const old = find(data, id);
          if (old.status === 'settled' && (!acknowledgeSettled || input.type !== old.type)) throw new Error('Use o fluxo de correção da conta confirmada.');
          return { ...data, commitments: bills.map(b => b.id === id ? { ...b, ...input, description: input.description.trim(), updatedAt: now } : b) };
        }
        if (monthly) {
          const rule = { ...input, description: input.description.trim(), id: newId('recurrence'), active: true, generatedThrough: '', createdAt: now, updatedAt: now };
          return materializeCommitments({ ...data, commitmentRecurrences: [...(data.commitmentRecurrences ?? []), rule] }, localDate(), now);
        }
        return { ...data, commitments: [...bills, { ...input, description: input.description.trim(), id: newId('commitment'), status: 'pending', createdAt: now, updatedAt: now }] };
      });
    },
    settleCommitment(id: string, actualDate: string, actualAmountCents: number, correction = false) {
      return commit(data => {
        const bill = find(data, id);
        if (!isCivilDate(actualDate) || actualDate > localDate() || !validCents(actualAmountCents)) throw new Error('Informe valor positivo e data efetiva válida, até hoje.');
        if (bill.status === 'settled' && !correction) throw new Error('Esta conta já foi confirmada.');
        if (correction && bill.status !== 'settled') throw new Error('A conta ainda não foi confirmada.');
        const transactionId = bill.transactionId ?? `commitment-tx:${bill.id}`;
        if (!correction && data.transactions.some(t => t.id === transactionId || t.commitmentId === id)) throw new Error('Já existe um lançamento para esta conta.');
        const transaction = { id: transactionId, commitmentId: id, description: bill.description, categoryId: bill.categoryId, type: transactionType(bill.type), amountCents: actualAmountCents, date: actualDate };
        // Em uma correção preserva descrição/categoria eventualmente editadas no Extrato.
        const transactions = correction ? data.transactions.map(t => t.id === transactionId ? { ...t, date: actualDate, amountCents: actualAmountCents } : t) : [...data.transactions, transaction];
        return { ...data, transactions, commitments: data.commitments!.map(b => b.id === id ? { ...b, status: 'settled', actualDate, actualAmountCents, transactionId, updatedAt: new Date().toISOString() } : b) };
      });
    },
    undoCommitment(id: string) {
      return commit(data => {
        const bill = find(data, id); if (bill.status !== 'settled') throw new Error('Esta conta não está confirmada.');
        const { actualDate: _date, actualAmountCents: _amount, transactionId: _transaction, ...pending } = bill;
        return { ...data, transactions: data.transactions.filter(t => t.id !== bill.transactionId), commitments: data.commitments!.map(b => b.id === id ? { ...pending, status: 'pending', updatedAt: new Date().toISOString() } : b) };
      });
    },
    deleteCommitment(id: string, confirmedAction?: 'keep-transaction' | 'delete-transaction') {
      return commit(data => {
        const bill = find(data, id);
        if (bill.status === 'settled' && !confirmedAction) throw new Error('Escolha explicitamente o que fazer com a Transação efetiva.');
        return { ...data, commitments: data.commitments!.filter(b => b.id !== id), transactions: confirmedAction === 'delete-transaction' ? data.transactions.filter(t => t.id !== bill.transactionId) : data.transactions.map(t => { if (t.id !== bill.transactionId) return t; const { commitmentId: _link, ...detached } = t; return detached; }) };
      });
    },
    updateCommitmentRecurrence(id: string, input: CommitmentInput) {
      return commit(data => {
        validateCommitmentInput(input, data.categories);
        const old = data.commitmentRecurrences?.find(r => r.id === id);
        if (!old?.active || old.type !== input.type || old.dueDate.slice(0, 7) !== input.dueDate.slice(0, 7)) throw new Error('Recorrência inválida. Preserve o tipo e o mês inicial.');
        const now = new Date().toISOString();
        return { ...data, commitmentRecurrences: data.commitmentRecurrences!.map(r => r.id === id ? { ...r, ...input, updatedAt: now } : r), commitments: (data.commitments ?? []).map(b => b.recurrenceId === id && b.status === 'pending' && b.dueDate >= localDate() ? { ...b, ...input, dueDate: materializedDate(input.dueDate, b.occurrenceMonth!), updatedAt: now } : b) };
      });
    },
    stopCommitmentRecurrence(id: string) {
      return commit(data => {
        if (!data.commitmentRecurrences?.some(r => r.id === id && r.active)) throw new Error('Recorrência já encerrada ou não encontrada.');
        return { ...data, commitmentRecurrences: data.commitmentRecurrences.map(r => r.id === id ? { ...r, active: false, updatedAt: new Date().toISOString() } : r) };
      });
    },
    refreshCommitmentRecurrences(today = localDate()) {
      if (!isCivilDate(today)) return Promise.reject(new Error('Data inválida.'));
      return commit(data => materializeCommitments(data, today, new Date().toISOString()));
    },
  };
}
