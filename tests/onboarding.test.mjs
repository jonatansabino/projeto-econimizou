import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMockData } from '../src/data/mock-data.ts';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

test('instalação nova mantém apresentação pendente até salvar nome e conclusão', async () => {
  let raw = null;
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; } });
  const store = createFinanceStore(repository); await store.initialize();
  assert.equal(store.getSnapshot().data.onboarding.completed, false);
  const original = store.getSnapshot().data.transactions;
  await assert.rejects(store.completeOnboarding('   '));
  await store.completeOnboarding(' Ana ');
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.equal(restarted.getSnapshot().data.profile.name, 'Ana');
  assert.equal(restarted.getSnapshot().data.onboarding.completed, true);
  assert.deepEqual(restarted.getSnapshot().data.transactions, original);
});
test('dados da versão 2 anteriores ao onboarding são preservados e dispensados do tutorial', async () => {
  const old = createMockData(); delete old.onboarding; old.profile.name = 'Perfil existente';
  let raw = JSON.stringify(old); let writes = 0;
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; writes++; } });
  const loaded = await repository.load();
  assert.deepEqual(loaded, { ...old, onboarding: { completed: true } });
  await repository.load(); assert.equal(writes, 1);
});
test('conclusão não publicada em caso de falha de armazenamento', async () => {
  const store = createFinanceStore({ load: async () => createMockData(), save: async () => { throw new Error('disk'); } });
  await store.initialize(); await assert.rejects(store.completeOnboarding('Novo nome'));
  assert.equal(store.getSnapshot().data.onboarding.completed, false);
  assert.notEqual(store.getSnapshot().data.profile.name, 'Novo nome');
});
