import { isCivilDate } from './civil-date.ts';
import { validateCommitments, type Commitment, type CommitmentRecurrence } from './commitments.ts';
import type { ChatMessage, Notification, Recommendation } from './features.ts';
import { validPhotoRef } from './profile-photo.ts';
export { isCivilDate };
export type TransactionType = 'income' | 'expense';
export type Category = { id: string; name: string; type: TransactionType; remoteId?: string; archived?: boolean };
export type TransactionInput = {
  description: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string;
  date: string; // Data civil local, YYYY-MM-DD; sem conversão para UTC.
};
export type Transaction = TransactionInput & { id: string; commitmentId?: string };
export type Goal = { id: string; name: string; targetCents: number; savedCents: number };
/** Fonte de renda para planejamento (armazenada nas preferências locais). */
export type IncomeSource = {
  id: string;
  label: string;
  amountCents: number;
  dayOfMonth: number | null;
};

export type FinanceData = {
  version: 2;
  financeResetKey?: string;
  financeRevision?: number;
  commitments?: Commitment[];
  commitmentRecurrences?: CommitmentRecurrence[];
  onboarding?: { completed: boolean };
  profile: { name: string; avatar: string; photoRef?: string | null };
  preferences: {
    hideAmounts: boolean;
    notificationsEnabled: boolean;
    animationsEnabled: boolean;
    incomeDay?: number | null;
    /** Fontes de renda múltiplas para planejamento. Substituem incomeDay quando presentes. */
    incomeSources?: IncomeSource[];
  };
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  chatMessages: ChatMessage[];
  recommendations: Recommendation[];
  notifications: Notification[];
};

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


function amount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function type(value: unknown): value is TransactionType {
  return value === 'income' || value === 'expense';
}
function uniqueIds(items: { id: string }[]) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function validateGoal(value: unknown): asserts value is Goal {
  if (!record(value) || !text(value.id) || !text(value.name) || !amount(value.targetCents) || value.targetCents === 0 || !amount(value.savedCents)) throw new Error('Meta inválida.');
}

export function validateTransaction(value: unknown, categories: Category[]): asserts value is Transaction {
  if (!record(value) || !text(value.id) || !text(value.description) || !amount(value.amountCents) || value.amountCents === 0 ||
    !type(value.type) || !isCivilDate(value.date) || !categories.some((category) => category.id === value.categoryId && category.type === value.type)) {
    throw new Error('Transação inválida. Confira descrição, valor, data e categoria.');
  }
}

// Valida também dados recuperados do disco; versões desconhecidas nunca são sobrescritas.
export function validateFinanceData(value: unknown): asserts value is FinanceData {
  if (!record(value) || value.version !== 2 || !record(value.profile) || !text(value.profile.name) || !text(value.profile.avatar) ||
    !record(value.preferences) || typeof value.preferences.hideAmounts !== 'boolean' || typeof value.preferences.notificationsEnabled !== 'boolean' || typeof value.preferences.animationsEnabled !== 'boolean' ||
    !Array.isArray(value.categories) || !Array.isArray(value.transactions) || !Array.isArray(value.goals) || !Array.isArray(value.chatMessages) || !Array.isArray(value.recommendations) || !Array.isArray(value.notifications)) {
    throw new Error('Dados locais inválidos ou versão não suportada.');
  }
  if (value.preferences.incomeDay !== undefined && value.preferences.incomeDay !== null && (!Number.isInteger(value.preferences.incomeDay) || (value.preferences.incomeDay as number) < 1 || (value.preferences.incomeDay as number) > 31)) {
    throw new Error('Dia de recebimento inválido.');
  }
  // Valida fontes de renda múltiplas (campo opcional; retrocompatível).
  if (value.preferences.incomeSources !== undefined) {
    if (!Array.isArray(value.preferences.incomeSources)) throw new Error('Fontes de renda inválidas.');
    for (const src of value.preferences.incomeSources as unknown[]) {
      if (!record(src) || !text(src.id) || !text(src.label) || !amount(src.amountCents) || src.amountCents === 0) {
        throw new Error('Fonte de renda inválida: campos obrigatórios ausentes ou inválidos.');
      }
      if (src.dayOfMonth !== null && src.dayOfMonth !== undefined && (!Number.isInteger(src.dayOfMonth) || (src.dayOfMonth as number) < 1 || (src.dayOfMonth as number) > 31)) {
        throw new Error('Dia de recebimento da fonte de renda inválido.');
      }
    }
    const sourceIds = (value.preferences.incomeSources as IncomeSource[]).map((s) => s.id);
    if (new Set(sourceIds).size !== sourceIds.length) throw new Error('Fontes de renda com IDs duplicados.');
  }
  if (value.profile.photoRef != null && !validPhotoRef(value.profile.photoRef)) throw new Error('Referência local da foto inválida.');
  if (value.onboarding !== undefined && (!record(value.onboarding) || typeof value.onboarding.completed !== 'boolean')) throw new Error('Preferência de apresentação inválida.');
  for (const category of value.categories) {
    if (!record(category) || !text(category.id) || !text(category.name) || !type(category.type)) throw new Error('Categoria inválida.');
  }
  const categories = value.categories as Category[];
  if (categories.some(c => (c.remoteId !== undefined && (typeof c.remoteId !== 'string' || !/^\d+$/.test(c.remoteId))) || (c.archived !== undefined && typeof c.archived !== 'boolean'))) throw new Error('Metadados de categoria inválidos.');
  const remoteIds = categories.flatMap(c => c.remoteId ? [c.remoteId] : []);
  if (new Set(remoteIds).size !== remoteIds.length) throw new Error('Categorias remotas duplicadas.');
  for (const transaction of value.transactions) validateTransaction(transaction, categories);
  for (const goal of value.goals) {
    validateGoal(goal);
  }
  if (![categories, value.transactions as Transaction[], value.goals as Goal[]].every(uniqueIds)) throw new Error('Identificadores duplicados.');
  for (const message of value.chatMessages) {
    if (!record(message) || !text(message.id) || !text(message.text) || !['user', 'assistant'].includes(String(message.role))) throw new Error('Mensagem inválida.');
    if (message.proposal !== undefined && message.goalProposal !== undefined) throw new Error('Mensagem com propostas conflitantes.');
    if (message.proposal !== undefined) {
      if (!record(message.proposal) || message.role !== 'assistant' || !['pending', 'confirmed', 'cancelled'].includes(String(message.status))) throw new Error('Confirmação inválida.');
      // Categorias podem ser removidas depois de um registro confirmado ou cancelado.
      if (!text(message.proposal.categoryId)) throw new Error('Categoria da proposta inválida.');
      validateTransaction({ ...message.proposal, id: message.id }, message.status === 'pending' ? categories : [{ id: message.proposal.categoryId, name: 'Histórico', type: message.proposal.type as TransactionType }]);
    } else if (message.goalProposal !== undefined) {
      if (!record(message.goalProposal) || message.role !== 'assistant' || !['pending', 'confirmed', 'cancelled'].includes(String(message.status))) throw new Error('Confirmação de meta inválida.');
      validateGoal({ ...message.goalProposal, id: message.id });
    } else if (message.status !== undefined) throw new Error('Confirmação sem proposta.');
    if (message.request !== undefined) {
      if (message.role !== 'assistant' || !record(message.request) || message.status !== undefined || message.proposal !== undefined || message.goalProposal !== undefined) throw new Error('Pergunta de acompanhamento inválida.');
      if (message.request.kind === 'goal') {
        if (message.request.name !== undefined && !text(message.request.name)) throw new Error('Nome da meta inválido.');
        if (message.request.targetCents !== undefined && (!amount(message.request.targetCents) || message.request.targetCents === 0)) throw new Error('Valor da meta inválido.');
      } else if (message.request.kind === 'transaction') {
        const draft = message.request.draft;
        if (!record(draft) || !text(draft.categoryId)) throw new Error('Dados de acompanhamento inválidos.');
        validateTransaction({ ...draft, id: message.id, amountCents: 1 }, [{ id: draft.categoryId, name: 'Histórico', type: draft.type as TransactionType }]);
      } else throw new Error('Tipo de acompanhamento inválido.');
    }
  }
  for (const recommendation of value.recommendations) {
    if (!record(recommendation) || !text(recommendation.id) || !text(recommendation.title) || !text(recommendation.description) || !['pending', 'accepted', 'ignored'].includes(String(recommendation.status))) throw new Error('Recomendação inválida.');
  }
  for (const notification of value.notifications) {
    if (!record(notification) || !text(notification.id) || !text(notification.title) || !text(notification.body) || !isCivilDate(notification.date) || typeof notification.read !== 'boolean') throw new Error('Notificação inválida.');
  }
  if (![value.chatMessages, value.recommendations, value.notifications].every((items) => uniqueIds(items as { id: string }[]))) throw new Error('Identificadores duplicados.');
  validateCommitments(value as FinanceData);
  // Impede estouro de precisão também nos totais agregados.
  summarize(value.transactions as Transaction[], '2000-01');
}

export function summarize(transactions: Transaction[], month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.');
  let grossCents = 0;
  let balanceCents = 0;
  let incomeCents = 0;
  let expenseCents = 0;
  for (const transaction of transactions) {
    grossCents += transaction.amountCents;
    balanceCents += transaction.type === 'income' ? transaction.amountCents : -transaction.amountCents;
    if (transaction.date.slice(0, 7) === month) {
      if (transaction.type === 'income') incomeCents += transaction.amountCents;
      else expenseCents += transaction.amountCents;
    }
    if (![grossCents, balanceCents, incomeCents, expenseCents].every(Number.isSafeInteger)) throw new Error('Total financeiro fora do limite suportado.');
  }
  return { balanceCents, incomeCents, expenseCents };
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/** Soma os centavos de todas as fontes de renda. Retorna 0 para lista vazia. */
export function totalIncomeSources(sources: IncomeSource[]): number {
  return sources.reduce((sum, s) => sum + s.amountCents, 0);
}

/** Gera um ID único simples para uma nova fonte de renda. */
export function newIncomeSourceId(): string {
  return `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
