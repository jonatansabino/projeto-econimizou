import { ApiError } from '../domain/auth.ts';
import { applyBankSnapshot, bankChanges, type FinancialApi } from '../domain/remote-finance.ts';
import { categoryInUse, mergeCategories, type CategoryApi } from '../domain/categories.ts';
import { createCommitmentActions } from '../data/commitment-operations.ts';
import type { FinanceRepository } from '../data/finance-repository.ts';
import { createMockData } from '../data/mock-data.ts';
import { materializeCommitments } from '../domain/commitments.ts';
import { chatDecision, interpretCommand, normalize } from '../domain/features.ts';
import { localDate, validateFinanceData, type Category, type FinanceData, type Goal, type TransactionInput } from '../domain/finance.ts';

export type FinanceSnapshot =
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: string }
  | { status: 'ready'; data: FinanceData; error: string | null; categoryError?: string | null };

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function createFinanceStore(repository: FinanceRepository, seed = createMockData, categoryApi?: CategoryApi, financialApi?: FinancialApi) {
  let snapshot: FinanceSnapshot = { status: 'loading', data: null, error: null };
  const listeners = new Set<() => void>();
  let initializing: Promise<void> | null = null;
  let queue = Promise.resolve();
  let sequence = 0;
  let categoryRevision = 0;
  const publish = (next: FinanceSnapshot) => {
    snapshot = freeze(next.status === 'ready' ? { ...next, categoryError: next.categoryError === undefined && snapshot.status === 'ready' ? snapshot.categoryError ?? null : next.categoryError ?? null } : next);
    listeners.forEach((listener) => listener());
  };

  const initialize = (): Promise<void> => {
    if (snapshot.status === 'ready') return Promise.resolve();
    if (initializing) return initializing;
    publish({ status: 'loading', data: null, error: null });
    initializing = (async () => {
      try {
        const saved = await repository.load();
        const original = saved ?? seed();
        validateFinanceData(original);
        const initial = financialApi ? applyBankSnapshot(original, await financialApi.read()) : original;
        const data = materializeCommitments(initial, localDate(), new Date().toISOString());
        validateFinanceData(data);
        if (financialApi) { try { await repository.clearLegacy?.(); } catch { /* Não compromete os dados confirmados no banco. */ } }
        if (saved === null) await repository.save(data);
        else if (data !== original) {
          try { await repository.save(data); }
          catch {
            publish({ status: 'ready', data: initial, error: 'Não foi possível ampliar as recorrências. Os dados anteriores foram preservados. Tente novamente em Contas.' });
            return;
          }
        }
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
  const commit = (update: (data: FinanceData) => FinanceData | Promise<FinanceData>, preserveFinancialError = false, fromBank = false) => {
    if (snapshot.status !== 'ready') return Promise.reject(new Error('Aguarde o carregamento dos dados.'));
    const pending = queue.then(async () => {
      if (snapshot.status !== 'ready') throw new Error('Dados indisponíveis.');
      const previous = snapshot.data;
      const result = update(previous);
      let next = result instanceof Promise ? await result : result;
      if (next === previous) { if (snapshot.error && !preserveFinancialError) publish({ status: 'ready', data: previous, error: null }); return; }
      validateFinanceData(next);
      let confirmedInBank = false;
      if (financialApi && !fromBank) {
        const changes = bankChanges(previous, next);
        if (changes.length) {
          try {
            const bank = await financialApi.apply({reset_key:previous.financeResetKey!,revision:previous.financeRevision!,operation_id:newId('operation'),changes});
            next = applyBankSnapshot(next, bank); validateFinanceData(next); confirmedInBank = true;
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              try {
                const actual = applyBankSnapshot(previous, await financialApi.read()); validateFinanceData(actual);
                try { await repository.save(actual); } catch { /* Banco continua sendo a fonte principal. */ }
                publish({status:'ready',data:actual,error:error.message});
              } catch { /* Mantém a última versão confirmada; não publica sucesso. */ }
            }
            throw error;
          }
        }
      }
      try {
        await repository.save(next);
      } catch {
        if (confirmedInBank) { publish({status:'ready',data:next,error:'Salvo no banco. Não foi possível atualizar a cópia local.'}); return; }
        publish({ status: 'ready', data: previous, error: preserveFinancialError ? snapshot.error : 'Não foi possível salvar. Tente novamente.' });
        throw new Error('Não foi possível salvar. Tente novamente.');
      }
      publish({ status: 'ready', data: next, error: preserveFinancialError ? snapshot.error : null });
    });
    queue = pending.catch(() => {});
    return pending;
  };

  const newId = (prefix: string) => {
    let id: string;
    do { id = `${prefix}-${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2,10)}`; }
    while (snapshot.data && [snapshot.data.transactions, snapshot.data.categories, snapshot.data.goals, snapshot.data.chatMessages, snapshot.data.notifications, snapshot.data.commitments ?? [], snapshot.data.commitmentRecurrences ?? []].some((items) => items.some((item) => item.id === id)));
    return id;
  };
  const notify = (data: FinanceData, title: string, body: string): FinanceData => data.preferences.notificationsEnabled
    ? { ...data, notifications: [...data.notifications, { id: newId('notification'), title, body, date: localDate(), read: false }] } : data;

  const resolveMessage = (data: FinanceData, id: string, confirm: boolean): FinanceData => {
    const message = data.chatMessages.find((item) => item.id === id);
    if ((!message?.proposal && !message?.goalProposal) || message.status !== 'pending') throw new Error('Esta proposta já foi respondida.');
    const goal = message.goalProposal;
    const transaction = message.proposal;
    const priorChatTransaction = data.transactions.find(t => t.id === `tx-chat:${message.id}`);
    if (confirm && transaction && priorChatTransaction && ['description','amountCents','type','date','categoryId'].some(key => priorChatTransaction[key as keyof TransactionInput] !== transaction[key as keyof TransactionInput])) throw new Error('O lançamento desta proposta já existe com outros dados. Revise no Extrato.');
    if (confirm && transaction && data.categories.find(c => c.id === transaction.categoryId)?.archived) throw new Error('A categoria foi excluída. Cancele a proposta e selecione outra categoria.');
    const updated: FinanceData = { ...data,
      transactions: confirm && transaction ? [...data.transactions.filter(t => t.id !== `tx-chat:${message.id}`), { ...transaction, id: `tx-chat:${message.id}` }] : data.transactions,
      goals: confirm && goal ? [...data.goals, { ...goal, id: newId('goal') }] : data.goals,
      chatMessages: [...data.chatMessages.map((item) => item.id === id ? { ...item, status: confirm ? 'confirmed' as const : 'cancelled' as const } : item),
        { id: newId('message'), role: 'assistant', text: confirm
          ? goal ? 'Meta criada! Você já pode acompanhar seu progresso na aba Metas. Nenhum valor foi movimentado no extrato.' : 'Transação registrada! Seu saldo e extrato já foram atualizados.'
          : goal ? 'Tudo bem, não criei essa meta.' : 'Tudo bem, não registrei essa Transação.' }],
    };
    return confirm ? notify(updated, goal ? 'Meta criada pelo chat' : 'Transação registrada pelo chat', goal?.name ?? transaction!.description) : updated;
  };

  const refreshBank = async () => {
      if (!financialApi) return;
      const revision = categoryRevision;
      try {
        const bank = await financialApi.read();
        await commit(data => {
          if (revision !== categoryRevision || (data.financeResetKey === bank.resetKey && (data.financeRevision ?? 0) > bank.revision)) return data;
          return applyBankSnapshot(data, bank);
        }, true, true);
        if (snapshot.status === 'ready') publish({...snapshot,categoryError:null});
      } catch(error) {
        if(snapshot.status === 'ready')publish({...snapshot,categoryError:error instanceof Error?error.message:'Não foi possível atualizar o banco.'});
        throw error;
      }
  };

  return {
    ...createCommitmentActions(commit, newId),
    initialize,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async addTransaction(input: TransactionInput, requestId?: string) {
      // IDs locais sem dependência nativa; verifica colisões com o estado carregado.
      const id = requestId ?? newId('tx');
      const transaction = { ...input, id, description: input.description.trim() };
      await commit((data) => {
        const prior = data.transactions.find(t => t.id === id);
        if (prior && ['description','amountCents','type','date','categoryId'].some(key => prior[key as keyof TransactionInput] !== transaction[key as keyof TransactionInput])) throw new Error('Este lançamento já foi gravado. Revise no Extrato antes de alterar.');
        if (data.categories.find(c => c.id === input.categoryId)?.archived) throw new Error('Categoria excluída. Selecione outra categoria.'); return { ...data, transactions: [...data.transactions.filter(t => t.id !== id), transaction] }; });
      return id;
    },
    updateTransaction(id: string, input: TransactionInput) {
      const transaction = { ...input, id, description: input.description.trim() };
      return commit((data) => {
        const old = data.transactions.find(item => item.id === id);
        if (!old) throw new Error('Transação não encontrada.');
        if (old.commitmentId && (old.type !== input.type || input.date > localDate())) throw new Error('Preserve o tipo e uma data efetiva até hoje. Gerencie a confirmação em Contas.');
        return { ...data, transactions: data.transactions.map(item => item.id === id ? { ...transaction, ...(old.commitmentId ? { commitmentId: old.commitmentId } : {}) } : item), ...(data.commitments ? { commitments: data.commitments.map(b => b.id === old.commitmentId ? { ...b, actualDate: input.date, actualAmountCents: input.amountCents, updatedAt: new Date().toISOString() } : b) } : {}) };
      });
    },
    deleteTransaction(id: string) {
      return commit((data) => {
        if (!data.transactions.some((item) => item.id === id)) throw new Error('Transação não encontrada.');
        if (data.transactions.find(item => item.id === id)?.commitmentId) throw new Error('Esta Transação está vinculada a uma conta. Use o fluxo de correção em Contas.');
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
      return commit((data) => ({ ...data, profile: { ...data.profile, ...next, ...(profile.photoRef !== undefined ? { photoRef: profile.photoRef } : {}) } }));
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
    refreshBank,
    async refreshCategories() {
      if (financialApi) { await refreshBank(); return; }
      if (!categoryApi) return;
      try {
        const revision = categoryRevision;
        const remote = await categoryApi.list();
        await commit(data => {
          if (revision !== categoryRevision) return data;
          const categories = mergeCategories(data.categories, remote, true);
          return JSON.stringify(categories) === JSON.stringify(data.categories) ? data : { ...data, categories };
        }, true);
        if (snapshot.status === 'ready') publish({ ...snapshot, categoryError: null });
      } catch (error) {
        if (snapshot.status === 'ready') publish({ ...snapshot, categoryError: error instanceof Error ? error.message : 'Não foi possível atualizar categorias. Usando a cópia local.' });
        throw error;
      }
    },
    saveCategory(input: Pick<Category, 'name' | 'type'>, id?: string) {
      categoryRevision++;
      const category = { name: input.name.trim(), type: input.type, id: id ?? newId('category') };
      return commit(async data => {
        const old = data.categories.find(item => item.id === id);
        if (id && !old) throw new Error('Categoria não encontrada.');
        if (!category.name || category.name.length > 100 || !['expense', 'income'].includes(category.type)) throw new Error('Informe um nome e tipo válidos.');
        if (old?.archived) throw new Error('Esta categoria foi excluída. Crie outra categoria.');
        if (old?.remoteId && old.type !== category.type) throw new Error('O tipo da categoria salva no banco é fixo. Crie outra categoria.');
        if (id && categoryInUse(data, id) && old?.type !== category.type) throw new Error('Esta categoria está em uso. Mantenha o tipo original.');
        if (data.categories.some(item => item.id !== id && !item.archived && item.type === category.type && normalize(item.name) === normalize(category.name))) throw new Error('Já existe uma categoria com esse nome e tipo.');
        const categories = id ? data.categories.map(item => item.id === id ? { ...item, ...category } : item) : [...data.categories, category];
        if (!categoryApi) return { ...data, categories };
        const remote = old?.remoteId ? await categoryApi.update(old.remoteId, { name: category.name, type: category.type }) : await categoryApi.create({ name: category.name, type: category.type }, category.id);
        categoryRevision++;
        const base = !id && data.categories.some(c => c.remoteId === remote.id) ? data.categories : categories;
        return { ...data, categories: mergeCategories(base, [remote]) };
      });
    },
    deleteCategory(id: string) {
      categoryRevision++;
      return commit(async data => {
        const old = data.categories.find(c => c.id === id);
        if (!old) throw new Error('Categoria não encontrada.');
        if (categoryInUse(data, id)) throw new Error('Esta categoria está em uso. Altere os registros vinculados e resolva as confirmações do chat antes de excluí-la.');
        if (old.remoteId && categoryApi) await categoryApi.remove(old.remoteId);
        categoryRevision++;
        // Tombstone local acompanha o servidor, preservando referências em outros aparelhos.
        return { ...data, categories: old.remoteId ? data.categories.map(c => c.id === id ? { ...c, archived: true } : c) : data.categories.filter(c => c.id !== id) };
      });
    },
    markNotificationsRead() {
      return commit((data) => ({ ...data, notifications: data.notifications.map((item) => ({ ...item, read: true })) }));
    },
    sendMessage(text: string) {
      const content = text.trim();
      if (!content || content.length > 1000) return Promise.reject(new Error('Escreva uma mensagem de até 1.000 caracteres.'));
      return commit((data) => {
        const last = [...data.chatMessages].reverse().find((item) => item.role === 'assistant');
        const userMessage = { id: newId('message'), role: 'user' as const, text: content };
        const decision = chatDecision(content);
        if (last?.status === 'pending' && (last.proposal || last.goalProposal) && decision !== undefined) {
          return resolveMessage({ ...data, chatMessages: [...data.chatMessages, userMessage] }, last.id, decision);
        }
        const response = interpretCommand(content, data.categories.filter(c => !c.archived), data.transactions, new Date(), last?.request);
        return { ...data, chatMessages: [...data.chatMessages, userMessage,
          { id: newId('message'), role: 'assistant', ...response, ...(response.proposal || response.goalProposal ? { status: 'pending' as const } : {}) },
        ] };
      });
    },
    resolveProposal(id: string, confirm: boolean) {
      return commit((data) => resolveMessage(data, id, confirm));
    },
    updatePreferences(preferences: Partial<FinanceData['preferences']>) {
      return commit((data) => ({ ...data, preferences: { ...data.preferences, ...preferences } }));
    },
  };
}
export type FinanceStore = ReturnType<typeof createFinanceStore>;
