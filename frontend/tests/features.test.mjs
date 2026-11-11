import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { categoryTotals, filterTransactions, interpretCommand, parseDate, parseMoney, periodRange } from '../src/domain/features.ts';
import { summarize } from '../src/domain/finance.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

const now = new Date(2026, 10, 3, 12);
function fixture(initial = null) {
  let raw = initial;
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; } });
  const store = createFinanceStore(repository, () => createMockData(now));
  return { repository, store, read: () => JSON.parse(raw) };
}

test('valores brasileiros são convertidos sem arredondamentos ou ambiguidade de milhares', () => {
  for (const [value, cents] of [['45', 4500], ['R$ 1.234,56', 123456], ['1.000', 100000], ['1234.56', 123456], ['0,01', 1], ['0', 0]]) assert.equal(parseMoney(value, true), cents);
  for (const value of ['', '-12', '1,234', '1e3', 'R$ abc', '1.2.3', 'NaN', '0']) assert.throws(() => parseMoney(value));
  assert.equal(parseDate('03/11/2026'), '2026-11-03');
  assert.throws(() => parseDate('31/02/2026'));
});

test('filtros combinam pesquisa sem acentos, tipo, categoria e limites inclusivos', () => {
  const data = createMockData(now);
  const result = filterTransactions(data.transactions, { query: 'almoco', type: 'expense', categoryId: 'food', start: '2026-11-03', end: '2026-11-03' });
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'Almoço');
  assert.equal(filterTransactions(data.transactions, { start: '2027-01-01' }).length, 0);
  assert.equal(filterTransactions(data.transactions, { query: 'Salário', type: 'expense' }).length, 0);
  assert.deepEqual(periodRange('lastMonth', new Date(2026, 0, 5)), { start: '2025-12-01', end: '2025-12-31' });
  assert.deepEqual(periodRange('week', now), { start: '2026-10-28', end: '2026-11-03' });
  assert.deepEqual(categoryTotals(data.transactions, data.categories).map((item) => [item.id, item.total]), [['home', 150000], ['food', 33150], ['transport', 1800]]);
});

test('assistente interpreta despesas e receitas e não propõe valores inválidos', () => {
  const data = createMockData(now);
  const expense = interpretCommand('Gastei R$ 45 no almoço', data.categories, data.transactions, now).proposal;
  assert.deepEqual(expense, { description: 'almoço', amountCents: 4500, type: 'expense', categoryId: 'food', date: '2026-11-03' });
  const income = interpretCommand('Recebi R$ 1.234,56 de salário', data.categories, data.transactions, now).proposal;
  assert.equal(income.type, 'income'); assert.equal(income.categoryId, 'salary'); assert.equal(income.amountCents, 123456);
  assert.equal(interpretCommand('Gastei 0 no mercado', data.categories, data.transactions, now).proposal, undefined);
  assert.equal(interpretCommand('Gastei 45', [], [], now).proposal, undefined);
  assert.match(interpretCommand('saldo', data.categories, data.transactions, now).text, /3.350,50/);
});

test('chat exige confirmação, grava uma só vez e persiste mensagens e transação atomicamente', async () => {
  const { store, repository, read } = fixture(); await store.initialize();
  await store.sendMessage('Gastei R$ 45 no almoço');
  assert.equal(store.getSnapshot().data.transactions.length, 5);
  const proposal = store.getSnapshot().data.chatMessages.at(-1);
  assert.equal(proposal.status, 'pending');
  const outcomes = await Promise.allSettled([store.resolveProposal(proposal.id, true), store.resolveProposal(proposal.id, true)]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(store.getSnapshot().data.transactions.length, 6);
  const month = store.getSnapshot().data.transactions.at(-1).date.slice(0, 7);
  assert.equal(read().chatMessages.find((item) => item.id === proposal.id).status, 'confirmed');
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.deepEqual(restarted.getSnapshot().data, store.getSnapshot().data);
  assert.equal(summarize(read().transactions, month).balanceCents, 330550);
});

test('cancelar proposta e falha de gravação não criam transações', async () => {
  const { store } = fixture(); await store.initialize();
  await store.sendMessage('Gastei R$ 25 com cinema');
  const message = store.getSnapshot().data.chatMessages.at(-1);
  await store.resolveProposal(message.id, false);
  assert.equal(store.getSnapshot().data.transactions.length, 5);
  assert.equal(store.getSnapshot().data.chatMessages.find((item) => item.id === message.id).status, 'cancelled');
  await assert.rejects(store.resolveProposal(message.id, true));
  let fails = false;
  const failing = createFinanceStore({ load: async () => createMockData(now), save: async () => { if (fails) throw new Error('disk'); } });
  await failing.initialize(); await failing.sendMessage('Gastei 20 no almoço');
  const id = failing.getSnapshot().data.chatMessages.at(-1).id; fails = true;
  await assert.rejects(failing.resolveProposal(id, true));
  assert.equal(failing.getSnapshot().data.transactions.length, 5);
  assert.equal(failing.getSnapshot().data.chatMessages.at(-1).status, 'pending');
});

test('metas, perfil, preferências e decisões de recomendações persistem sem movimentar saldo', async () => {
  const { store, repository } = fixture(); await store.initialize();
  await store.updateProfile({ name: 'João', avatar: '🚀' });
  await store.saveGoal({ name: 'Viagem', targetCents: 100000, savedCents: 20000 });
  const goal = store.getSnapshot().data.goals.at(-1);
  await store.saveGoal({ name: 'Viagem 2027', targetCents: 120000, savedCents: 30000 }, goal.id);
  await store.decideRecommendation('rec-food', 'accepted');
  await store.decideRecommendation('rec-reserve', 'ignored');
  await assert.rejects(store.decideRecommendation('rec-food', 'accepted'));
  await store.updatePreferences({ hideAmounts: true, notificationsEnabled: false, animationsEnabled: false });
  assert.equal(summarize(store.getSnapshot().data.transactions, '2026-11').balanceCents, 335050);
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.deepEqual(restarted.getSnapshot().data, store.getSnapshot().data);
  assert.equal(restarted.getSnapshot().data.goals.at(-1).savedCents, 30000);
  await store.deleteGoal(goal.id);
  assert.equal(store.getSnapshot().data.goals.some((item) => item.id === goal.id), false);
});

test('categorias permitem CRUD e impedem duplicação, alteração incompatível e exclusão em uso', async () => {
  const { store } = fixture(); await store.initialize();
  await store.saveCategory({ name: 'Educação', type: 'expense' });
  const category = store.getSnapshot().data.categories.at(-1);
  await assert.rejects(store.saveCategory({ name: 'educacao', type: 'expense' }));
  await store.saveCategory({ name: 'Cursos', type: 'expense' }, category.id);
  await store.deleteCategory(category.id);
  assert.equal(store.getSnapshot().data.categories.some((item) => item.id === category.id), false);
  await assert.rejects(store.deleteCategory('food'), /em uso/);
  await assert.rejects(store.saveCategory({ name: 'Salário', type: 'expense' }, 'salary'));
  await store.sendMessage('Gastei 45 com lazer');
  await assert.rejects(store.deleteCategory('leisure'), /em uso/);
  await store.resolveProposal(store.getSnapshot().data.chatMessages.at(-1).id, false);
  await store.deleteCategory('leisure');
});

test('preferência de notificações interrompe novos avisos e leitura é persistida', async () => {
  const { store, repository } = fixture(); await store.initialize();
  await store.markNotificationsRead();
  assert.equal(store.getSnapshot().data.notifications.every((item) => item.read), true);
  const count = store.getSnapshot().data.notifications.length;
  await store.updatePreferences({ notificationsEnabled: false });
  await store.saveGoal({ name: 'Teste', targetCents: 1000, savedCents: 0 });
  assert.equal(store.getSnapshot().data.notifications.length, count);
  await store.updatePreferences({ notificationsEnabled: true });
  await store.saveGoal({ name: 'Nova', targetCents: 1000, savedCents: 0 });
  assert.equal(store.getSnapshot().data.notifications.length, count + 1);
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.equal(restarted.getSnapshot().data.notifications[0].read, true);
});

test('migração de versão 1 preserva dados antigos e grava versão 2 uma vez', async () => {
  const { chatMessages: _chat, recommendations: _rec, notifications: _notifications, ...old } = createMockData(now);
  old.version = 1;
  delete old.preferences.animationsEnabled;
  old.profile.name = 'Perfil antigo';
  const { store, read, repository } = fixture(JSON.stringify(old));
  await store.initialize();
  assert.equal(store.getSnapshot().status, 'ready');
  assert.equal(read().version, 2);
  assert.equal(read().profile.name, 'Perfil antigo');
  assert.deepEqual(read().transactions, old.transactions);
  assert.equal(read().preferences.animationsEnabled, true);
  assert.ok(read().chatMessages.length > 0);
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.deepEqual(restarted.getSnapshot().data, store.getSnapshot().data);
});
