import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFinanceRepository, FINANCE_STORAGE_KEY } from '../src/data/finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { summarize } from '../src/domain/finance.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

const date = new Date(2026, 10, 3, 12);
const seed = () => createMockData(date);

function fixture(raw = null) {
  const memory = { raw, writes: 0 };
  const storage = {
    async getItem(key) {
      assert.equal(key, FINANCE_STORAGE_KEY);
      return memory.raw;
    },
    async setItem(key, value) {
      assert.equal(key, FINANCE_STORAGE_KEY);
      memory.raw = value;
      memory.writes++;
    },
  };
  const repository = createFinanceRepository(storage);
  const store = createFinanceStore(repository, seed);
  return { memory, repository, store };
}

test('alterar renda planejada ou dia de recebimento não modifica transações nem saldo', async () => {
  const { store } = fixture();
  await store.initialize();

  const initialSummary = summarize(store.getSnapshot().data.transactions, '2026-11');
  const initialTransactionCount = store.getSnapshot().data.transactions.length;

  // Atualiza preferência de dia de recebimento
  await store.updatePreferences({ incomeDay: 10 });

  // Transações continuam idênticas
  const afterPref = store.getSnapshot().data;
  assert.equal(afterPref.transactions.length, initialTransactionCount);
  assert.equal(afterPref.preferences.incomeDay, 10);

  // Totais financeiros (saldo, receitas, despesas) continuam inalterados
  const afterSummary = summarize(afterPref.transactions, '2026-11');
  assert.deepEqual(afterSummary, initialSummary);
  assert.equal(afterSummary.balanceCents, 335050);
  assert.equal(afterSummary.incomeCents, 520000);
  assert.equal(afterSummary.expenseCents, 184950);
});

test('registrar receita atualiza receitas e saldo; editar e excluir recalculam totais', async () => {
  const { store } = fixture();
  await store.initialize();

  const initialSummary = summarize(store.getSnapshot().data.transactions, '2026-11');
  assert.equal(initialSummary.balanceCents, 335050);
  assert.equal(initialSummary.incomeCents, 520000);

  // 1. Registrar nova receita via Extrato
  const newIncome = {
    description: 'Consultoria Freelance',
    amountCents: 150000, // R$ 1.500,00
    type: 'income',
    categoryId: 'extra',
    date: '2026-11-10',
  };
  await store.addTransaction(newIncome);

  const afterAdd = summarize(store.getSnapshot().data.transactions, '2026-11');
  assert.equal(afterAdd.incomeCents, initialSummary.incomeCents + 150000);
  assert.equal(afterAdd.balanceCents, initialSummary.balanceCents + 150000);

  // 2. Editar receita registrada
  const addedTx = store.getSnapshot().data.transactions.find((t) => t.description === 'Consultoria Freelance');
  assert.ok(addedTx);
  await store.updateTransaction(addedTx.id, {
    description: 'Consultoria Freelance Especial',
    amountCents: 200000, // R$ 2.000,00 (+ R$ 500,00)
    type: 'income',
    categoryId: 'extra',
    date: '2026-11-10',
  });

  const afterEdit = summarize(store.getSnapshot().data.transactions, '2026-11');
  assert.equal(afterEdit.incomeCents, initialSummary.incomeCents + 200000);
  assert.equal(afterEdit.balanceCents, initialSummary.balanceCents + 200000);

  // 3. Excluir receita registrada
  await store.deleteTransaction(addedTx.id);

  const afterDelete = summarize(store.getSnapshot().data.transactions, '2026-11');
  assert.deepEqual(afterDelete, initialSummary);
});

test('prevenção de duplicidade: não duplica transações existentes ao salvar preferências', async () => {
  const { store } = fixture();
  await store.initialize();

  const initialIds = store.getSnapshot().data.transactions.map((t) => t.id);
  assert.equal(new Set(initialIds).size, initialIds.length);

  await store.updatePreferences({ incomeDay: 15, hideAmounts: true });

  const currentIds = store.getSnapshot().data.transactions.map((t) => t.id);
  assert.deepEqual(currentIds, initialIds);
});
