import { interpretCommand, normalize } from '../domain/features.ts';
import { createMockData } from '../data/mock-data.ts';
import type { FinanceRepository } from '../data/finance-repository.ts';
import { validateFinanceData, type FinanceData, type TransactionInput, type Goal, type Category, localDate } from '../domain/finance.ts';

export type FinanceSnapshot =
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: string }
  | { status: 'ready'; data: FinanceData; error: string | null };

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function createFinanceStore(repository: FinanceRepository, seed = createMockData) {
  let snapshot: FinanceSnapshot = { status: 'loading', data: null, error: null };
  const listeners = new Set<() => void>();
  let initializing: Promise<void> | null = null;
  let queue = Promise.resolve();
  let sequence = 0;
  const publish = (next: FinanceSnapshot) => {
    snapshot = freeze(next);
    listeners.forEach((listener) => listener());
  };

  const initialize = (): Promise<void> => {
    if (snapshot.status === 'ready') return Promise.resolve();
    if (initializing) return initializing;
    publish({ status: 'loading', data: null, error: null });
    initializing = (async () => {
      try {
        const saved = await repository.load();
        const data = saved ?? seed();
        validateFinanceData(data);
        if (saved === null) await repository.save(data);
        publish({ status: 'ready', data, error: null });
      } catch {
        publish({ status: 'error', data: null, error: 'Não foi possível carregar seus dados. Tente novamente. Os dados salvos foram preservados.' });
      } finally {
        initializing = null;
      }
    })();
    return initializing;
  };

  // Escritas sequenciais e publicação após salvar evitam dados perdidos e sucesso falso.
  const commit = (update: (data: FinanceData) => FinanceData) => {
    if (snapshot.status !== 'ready') return Promise.reject(new Error('Aguarde o carregamento dos dados.'));
    const pending = queue.then(async () => {
      if (snapshot.status !== 'ready') throw new Error('Dados indisponíveis.');
      const previous = snapshot.data;
      const next = update(previous);
      validateFinanceData(next);
      try {
        await repository.save(next);
      } catch {
        publish({ status: 'ready', data: previous, error: 'Não foi possível salvar. Tente novamente.' });
        throw new Error('Não foi possível salvar. Tente novamente.');
      }
      publish({ status: 'ready', data: next, error: null });
    });
    queue = pending.catch(() => {});
    return pending;
  };

  const newId = (prefix: string) => {
    let id: string;
    do { id = `${prefix}-${Date.now().toString(36)}-${++sequence}`; }
    while (snapshot.data && [snapshot.data.transactions, snapshot.data.categories, snapshot.data.goals, snapshot.data.chatMessages, snapshot.data.notifications].some((items) => items.some((item) => item.id === id)));
    return id;
  };
  const notify = (data: FinanceData, title: string, body: string): FinanceData => data.preferences.notificationsEnabled
    ? { ...data, notifications: [...data.notifications, { id: newId('notification'), title, body, date: localDate(), read: false }] } : data;

  return {
    initialize,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async addTransaction(input: TransactionInput) {
      // IDs locais sem dependência nativa; verifica colisões com o estado carregado.
      let id: string;
      do { id = `tx-${Date.now().toString(36)}-${++sequence}`; }
      while (snapshot.data?.transactions.some((transaction) => transaction.id === id));
      const transaction = { ...input, id, description: input.description.trim() };
      await commit((data) => ({ ...data, transactions: [...data.transactions, transaction] }));
      return id;
    },
    updateTransaction(id: string, input: TransactionInput) {
      const transaction = { ...input, id, description: input.description.trim() };
      return commit((data) => {
        if (!data.transactions.some((item) => item.id === id)) throw new Error('Transação não encontrada.');
        return { ...data, transactions: data.transactions.map((item) => item.id === id ? transaction : item) };
      });
    },
    deleteTransaction(id: string) {
      return commit((data) => {
        if (!data.transactions.some((item) => item.id === id)) throw new Error('Transação não encontrada.');
        return { ...data, transactions: data.transactions.filter((item) => item.id !== id) };
      });
    },
    completeOnboarding(name: string) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 60) return Promise.reject(new Error('Informe seu nome, com até 60 caracteres.'));
      return commit((data) => ({ ...data, onboarding: { completed: true }, profile: { ...data.profile, name: trimmed } }));
    },
    updateProfile(profile: FinanceData['profile']) {
      const next = { name: profile.name.trim(), avatar: profile.avatar.trim() };
      if (!next.name || !next.avatar) return Promise.reject(new Error('Informe seu nome e escolha um avatar.'));
      return commit((data) => ({ ...data, profile: next }));
    },
    saveGoal(input: Omit<Goal, 'id'>, id?: string) {
      const goal = { ...input, name: input.name.trim(), id: id ?? newId('goal') };
      return commit((data) => {
        if (id && !data.goals.some((item) => item.id === id)) throw new Error('Meta não encontrada.');
        return notify({ ...data, goals: id ? data.goals.map((item) => item.id === id ? goal : item) : [...data.goals, goal] }, 'Meta atualizada', `Acompanhe a meta “${goal.name}” na aba Metas.`);
      });
    },
    deleteGoal(id: string) {
      return commit((data) => ({ ...data, goals: data.goals.filter((item) => item.id !== id) }));
    },
    decideRecommendation(id: string, status: 'accepted' | 'ignored') {
      return commit((data) => {
        const recommendation = data.recommendations.find((item) => item.id === id);
        if (!recommendation || recommendation.status !== 'pending') throw new Error('Esta recomendação já foi respondida.');
        return notify({ ...data, recommendations: data.recommendations.map((item) => item.id === id ? { ...item, status } : item) }, 'Recomendação avaliada', status === 'accepted' ? 'Sugestão adicionada ao seu plano. Nenhum valor foi movimentado.' : 'Sugestão ignorada. Você pode seguir seu próprio plano.');
      });
    },
    saveCategory(input: Omit<Category, 'id'>, id?: string) {
      const category = { ...input, name: input.name.trim(), id: id ?? newId('category') };
      return commit((data) => {
        if (id && !data.categories.some((item) => item.id === id)) throw new Error('Categoria não encontrada.');
        if (id && (data.transactions.some((item) => item.categoryId === id && item.type !== category.type) || data.chatMessages.some((item) => item.status === 'pending' && item.proposal?.categoryId === id && item.proposal.type !== category.type))) throw new Error('Esta categoria está em uso. Mantenha o tipo original ou ajuste as transações primeiro.');
        if (data.categories.some((item) => item.id !== id && item.type === category.type && normalize(item.name) === normalize(category.name))) throw new Error('Já existe uma categoria com esse nome e tipo.');
        return { ...data, categories: id ? data.categories.map((item) => item.id === id ? category : item) : [...data.categories, category] };
      });
    },
    deleteCategory(id: string) {
      return commit((data) => {
        if (data.transactions.some((item) => item.categoryId === id) || data.chatMessages.some((item) => item.status === 'pending' && item.proposal?.categoryId === id)) throw new Error('Esta categoria está em uso. Altere as transações e resolva as confirmações do chat antes de excluí-la.');
        return { ...data, categories: data.categories.filter((item) => item.id !== id) };
      });
    },
    markNotificationsRead() {
      return commit((data) => ({ ...data, notifications: data.notifications.map((item) => ({ ...item, read: true })) }));
    },
    sendMessage(text: string) {
      const content = text.trim();
      if (!content || content.length > 1000) return Promise.reject(new Error('Escreva uma mensagem de até 1.000 caracteres.'));
      return commit((data) => {
        const response = interpretCommand(content, data.categories, data.transactions);
        return { ...data, chatMessages: [...data.chatMessages,
          { id: newId('message'), role: 'user', text: content },
          { id: newId('message'), role: 'assistant', ...response, ...(response.proposal ? { status: 'pending' as const } : {}) },
        ] };
      });
    },
    resolveProposal(id: string, confirm: boolean) {
      return commit((data) => {
        const message = data.chatMessages.find((item) => item.id === id);
        if (!message?.proposal || message.status !== 'pending') throw new Error('Esta proposta já foi respondida.');
        const updated: FinanceData = { ...data,
          transactions: confirm ? [...data.transactions, { ...message.proposal, id: newId('tx') }] : data.transactions,
          chatMessages: [...data.chatMessages.map((item) => item.id === id ? { ...item, status: confirm ? 'confirmed' as const : 'cancelled' as const } : item),
            { id: newId('message'), role: 'assistant', text: confirm ? 'Transação registrada! Seu saldo e extrato já foram atualizados.' : 'Tudo bem, não registrei essa transação.' }],
        };
        return confirm ? notify(updated, 'Transação registrada pelo chat', message.proposal.description) : updated;
      });
    },
    updatePreferences(preferences: Partial<FinanceData['preferences']>) {
      return commit((data) => ({ ...data, preferences: { ...data.preferences, ...preferences } }));
    },
  };
}
export type FinanceStore = ReturnType<typeof createFinanceStore>;
