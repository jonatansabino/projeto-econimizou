import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { interpretCommand } from '../src/domain/features.ts';
import { summarize, validateFinanceData } from '../src/domain/finance.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

const now = new Date(2026, 10, 3, 12);
const mock = () => createMockData(now);
const interpret = (text, context) => interpretCommand(text, mock().categories, mock().transactions, now, context);
function fixture() {
  let raw = null;
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; } });
  const store = createFinanceStore(repository, mock);
  return { store, repository };
}

test('pedido de economia para videogame pede valor sem inventar uma meta', () => {
  const response = interpret('Quero criar uma economia para comprar um videogame');
  assert.equal(response.proposal, undefined); assert.equal(response.goalProposal, undefined);
  assert.deepEqual(response.request, { kind: 'goal', name: 'Comprar um videogame' });
  const next = interpret('Preciso juntar 3.000', response.request);
  assert.deepEqual(next.goalProposal, { name: 'Comprar um videogame', targetCents: 300000, savedCents: 0 });
});

test('meta com valor em uma mensagem e meta com nome informado depois', () => {
  const direct = interpret('Quero economizar para comprar uma geladeira de R$ 2.500,00');
  assert.deepEqual(direct.goalProposal, { name: 'Comprar uma geladeira', targetCents: 250000, savedCents: 0 });
  const first = interpret('Quero criar uma meta de R$ 3.000');
  assert.equal(first.request.kind, 'goal'); assert.equal(first.request.targetCents, 300000);
  const next = interpret('Videogame', first.request);
  assert.equal(next.goalProposal.name, 'Videogame'); assert.equal(next.goalProposal.targetCents, 300000);
  assert.equal(interpret('Quero economizar para comprar um PS5').goalProposal, undefined);
});

test('relatos de almoço e gastos em posições diferentes são despesas de alimentação', () => {
  for (const text of ['Almocei por R$ 45', 'Almocei e gastei 45 reais', 'Hoje gastei R$ 45 no almoço', 'Gastei no almoço 45 reais', 'Almocei 45']) {
    const response = interpret(text);
    assert.equal(response.proposal?.type, 'expense', text);
    assert.equal(response.proposal?.amountCents, 4500, text);
    assert.equal(response.proposal?.categoryId, 'food', text);
  }
  const first = interpret('Almocei');
  assert.equal(first.request.kind, 'transaction');
  assert.equal(first.request.draft.description, 'Almoço');
  const next = interpret('Foi 45,90', first.request);
  assert.equal(next.proposal.amountCents, 4590); assert.equal(next.proposal.categoryId, 'food');
});

test('datas, horários e pessoas não viram dinheiro; zero, negativos e múltiplos valores exigem esclarecimento', () => {
  for (const text of ['Almocei com 2 amigos', 'Almocei às 12:30', 'Almocei em 03/11/2026', 'Gastei 2 horas no trânsito', 'Almocei por R$ -45', 'Gastei 0 no almoço', 'Gastei 45 no almoço e 20 no transporte']) {
    assert.equal(interpret(text).proposal, undefined, text);
  }
  assert.equal(interpret('Quero comprar um videogame de R$ 3.000 e R$ 200 de acessórios').goalProposal, undefined);
  assert.equal(interpret('Não gastei R$ 45 no almoço').proposal, undefined);
  assert.equal(interpret('Vou gastar R$ 45 no almoço').proposal, undefined);
  assert.equal(interpret('Quanto gastei neste mês?').proposal, undefined);
  assert.equal(interpret('Não quero criar uma meta para videogame').goalProposal, undefined);
});

test('relato de ontem usa data local e despesas/receitas novas podem substituir uma pergunta de meta', () => {
  assert.equal(interpret('Ontem almocei por R$ 45').proposal.date, '2026-11-02');
  assert.equal(interpret('Paguei R$ 45 no almoço em 01/11/2026').proposal.date, '2026-11-01');
  const context = interpret('Quero economizar para comprar um videogame').request;
  const expense = interpret('Almocei por R$ 45', context);
  assert.equal(expense.proposal.type, 'expense'); assert.equal(expense.goalProposal, undefined);
  const income = interpret('Recebi R$ 100 de Renda Extra', context);
  assert.equal(income.proposal.type, 'income'); assert.equal(income.goalProposal, undefined);
});

test('contexto da meta sobrevive à recarga e confirmação cria meta sem alterar saldo', async () => {
  const { store, repository } = fixture(); await store.initialize();
  const original = store.getSnapshot().data;
  await store.sendMessage('Quero criar uma economia para comprar um videogame');
  const restarted = createFinanceStore(repository); await restarted.initialize();
  await restarted.sendMessage('R$ 3.000');
  const proposal = restarted.getSnapshot().data.chatMessages.at(-1);
  assert.equal(proposal.goalProposal.targetCents, 300000);
  assert.equal(restarted.getSnapshot().data.goals.length, original.goals.length);
  const results = await Promise.allSettled([restarted.resolveProposal(proposal.id, true), restarted.resolveProposal(proposal.id, true)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(restarted.getSnapshot().data.goals.at(-1).name, 'Comprar um videogame');
  assert.deepEqual(restarted.getSnapshot().data.transactions, original.transactions);
  assert.equal(summarize(restarted.getSnapshot().data.transactions, '2026-11').balanceCents, 335050);
  const reloaded = createFinanceStore(repository); await reloaded.initialize();
  assert.deepEqual(reloaded.getSnapshot().data.goals, restarted.getSnapshot().data.goals);
});

test('cancelar meta ou pergunta não cria registros e confirmações textuais não duplicam', async () => {
  const { store } = fixture(); await store.initialize();
  await store.sendMessage('Quero criar uma meta de R$ 500 para viagem');
  await store.sendMessage('cancelar');
  assert.equal(store.getSnapshot().data.goals.length, 1);
  assert.equal(store.getSnapshot().data.chatMessages.some((message) => message.goalProposal && message.status === 'cancelled'), true);
  await store.sendMessage('Almocei'); await store.sendMessage('45');
  await Promise.all([store.sendMessage('sim'), store.sendMessage('sim')]);
  assert.equal(store.getSnapshot().data.transactions.length, 6);
  await store.sendMessage('Quero economizar para comprar uma bicicleta');
  await store.sendMessage('cancelar'); await store.sendMessage('3000');
  assert.equal(store.getSnapshot().data.chatMessages.at(-1).goalProposal, undefined);
});

test('falha de escrita mantém proposta de meta pendente e saldo intacto', async () => {
  let fails = false;
  const store = createFinanceStore({ load: async () => mock(), save: async () => { if (fails) throw new Error('disk'); } });
  await store.initialize(); await store.sendMessage('Quero economizar R$ 3000 para um videogame');
  const proposal = store.getSnapshot().data.chatMessages.at(-1);
  fails = true;
  await assert.rejects(store.resolveProposal(proposal.id, true));
  assert.equal(store.getSnapshot().data.goals.length, 1);
  assert.equal(store.getSnapshot().data.chatMessages.at(-1).status, 'pending');
  assert.equal(store.getSnapshot().data.transactions.length, 5);
});

test('validação rejeita propostas conflitantes ou contexto corrompido e mantém históricos antigos válidos', () => {
  const data = mock(); validateFinanceData(data);
  data.chatMessages.push({ id: 'bad', role: 'assistant', text: 'Pergunta', request: { kind: 'goal', targetCents: -1 } });
  assert.throws(() => validateFinanceData(data));
  data.chatMessages.pop();
  data.chatMessages.push({ id: 'bad', role: 'assistant', text: 'Proposta', status: 'pending', proposal: { description: 'Teste', amountCents: 1, type: 'expense', categoryId: 'food', date: '2026-11-03' }, goalProposal: { name: 'Teste', targetCents: 100, savedCents: 0 } });
  assert.throws(() => validateFinanceData(data));
});
