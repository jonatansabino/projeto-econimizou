import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFinanceRepository, FINANCE_STORAGE_KEY } from '../src/data/finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { isCivilDate, localDate, summarize, validateFinanceData } from '../src/domain/finance.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

const date = new Date(2026, 10, 3, 12);
const seed = () => createMockData(date);
const input = { description: 'Almoço', amountCents: 4500, categoryId: 'food', type: 'expense', date: '2026-11-03' };
function fixture(raw = null) {
  const memory = { raw, writes: 0, failRead: false, failWrite: false };
  const storage = {
    async getItem(key) {
      assert.equal(key, FINANCE_STORAGE_KEY);
      if (memory.failRead) throw new Error('read failed');
      return memory.raw;
    },
    async setItem(key, value) {
      assert.equal(key, FINANCE_STORAGE_KEY);
      if (memory.failWrite) throw new Error('disk full');
      memory.raw = value;
      memory.writes++;
    },
  };
  const repository = createFinanceRepository(storage);
  const store = createFinanceStore(repository, seed);
  return { memory, repository, store };
}

test('primeira abertura grava mocks uma vez e calcula saldo e totais do mês', async () => {
  const { store, memory } = fixture();
  assert.equal(store.getSnapshot().status, 'loading');
  await Promise.all([store.initialize(), store.initialize()]);
  assert.equal(memory.writes, 1);
  assert.equal(store.getSnapshot().status, 'ready');
  assert.deepEqual(summarize(store.getSnapshot().data.transactions, '2026-11'), {
    balanceCents: 335050, incomeCents: 520000, expenseCents: 184950,
  });
  await store.initialize();
  assert.equal(memory.writes, 1);
});

test('cadastro, edição de valor/tipo/categoria e exclusão recalculam valores e notificam assinantes', async () => {
  const { store } = fixture();
  await store.initialize();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  const id = await store.addTransaction(input);
  assert.equal(summarize(store.getSnapshot().data.transactions, '2026-11').balanceCents, 330550);
  await store.updateTransaction(id, { ...input, type: 'income', categoryId: 'extra', amountCents: 10000 });
  assert.deepEqual(summarize(store.getSnapshot().data.transactions, '2026-11'), {
    balanceCents: 345050, incomeCents: 530000, expenseCents: 184950,
  });
  await store.deleteTransaction(id);
  assert.equal(store.getSnapshot().data.transactions.length, 5);
  assert.equal(notifications, 3);
  unsubscribe();
  await store.addTransaction(input);
  assert.equal(notifications, 3);
});

test('nova instância restaura edições, exclusões e preferências sem reinserir mocks', async () => {
  const { store, repository, memory } = fixture();
  await store.initialize();
  const id = await store.addTransaction(input);
  await store.updateTransaction(id, { ...input, description: 'Almoço editado', amountCents: 999 });
  await store.deleteTransaction('mock-salary');
  await store.updatePreferences({ hideAmounts: true });
  const expected = store.getSnapshot().data;
  const writes = memory.writes;
  const restarted = createFinanceStore(repository, () => { throw new Error('não deve usar mocks'); });
  await restarted.initialize();
  assert.deepEqual(restarted.getSnapshot().data, expected);
  assert.equal(memory.writes, writes);
});

test('lista vazia salva continua vazia ao reiniciar', async () => {
  const data = seed();
  data.transactions = [];
  const { store, memory } = fixture(JSON.stringify(data));
  await store.initialize();
  assert.equal(store.getSnapshot().data.transactions.length, 0);
  assert.equal(memory.writes, 0);
});

test('operações simultâneas não perdem atualizações e gravam na ordem', async () => {
  const { store, memory } = fixture();
  await store.initialize();
  const ids = await Promise.all(Array.from({ length: 12 }, () => store.addTransaction({ ...input, amountCents: 1 })));
  assert.equal(new Set(ids).size, 12);
  assert.equal(store.getSnapshot().data.transactions.length, 17);
  assert.equal(JSON.parse(memory.raw).transactions.length, 17);
  assert.equal(summarize(store.getSnapshot().data.transactions, '2026-11').balanceCents, 335038);
});

test('persistência pendente não publica sucesso antes da gravação', async () => {
  let finish;
  let pending = false;
  const store = createFinanceStore({ load: async () => seed(), save: () => new Promise((resolve) => { pending = true; finish = resolve; }) }, seed);
  await store.initialize();
  const operation = store.addTransaction(input);
  await Promise.resolve();
  assert.equal(pending, true);
  assert.equal(store.getSnapshot().data.transactions.length, 5);
  finish();
  await operation;
  assert.equal(store.getSnapshot().data.transactions.length, 6);
});

test('falha de escrita preserva estado e disco; operação posterior pode salvar', async () => {
  const { store, memory } = fixture();
  await store.initialize();
  const saved = memory.raw;
  const before = store.getSnapshot().data;
  memory.failWrite = true;
  await assert.rejects(store.addTransaction(input), /salvar/);
  assert.equal(store.getSnapshot().data, before);
  assert.equal(memory.raw, saved);
  assert.match(store.getSnapshot().error, /salvar/);
  memory.failWrite = false;
  await store.addTransaction(input);
  assert.equal(store.getSnapshot().data.transactions.length, 6);
  assert.equal(store.getSnapshot().error, null);
});

test('falha de leitura admite nova tentativa; escrita bloqueada antes da hidratação', async () => {
  const { store, memory } = fixture();
  memory.failRead = true;
  await assert.rejects(store.addTransaction(input), /carregamento/);
  await store.initialize();
  assert.equal(store.getSnapshot().status, 'error');
  assert.equal(memory.writes, 0);
  memory.failRead = false;
  await store.initialize();
  assert.equal(store.getSnapshot().status, 'ready');
});

test('JSON corrompido e versão desconhecida não são sobrescritos', async () => {
  for (const raw of ['{bad json', JSON.stringify({ ...seed(), version: 999 })]) {
    const { store, memory } = fixture(raw);
    await store.initialize();
    assert.equal(store.getSnapshot().status, 'error');
    assert.equal(memory.raw, raw);
    assert.equal(memory.writes, 0);
  }
});

test('validação rejeita valores fracionários, zero, negativos, categoria incorreta e datas inválidas', async () => {
  const { store, memory } = fixture();
  await store.initialize();
  const invalid = [
    { amountCents: 1.2 }, { amountCents: 0 }, { amountCents: -100 }, { amountCents: Infinity },
    { categoryId: 'salary' }, { categoryId: 'missing' }, { description: ' ' }, { date: '2026-02-30' },
  ];
  for (const patch of invalid) await assert.rejects(store.addTransaction({ ...input, ...patch }));
  await assert.rejects(store.updateTransaction('missing', input), /não encontrada/);
  await assert.rejects(store.deleteTransaction('missing'), /não encontrada/);
  assert.equal(memory.writes, 1);
  assert.equal(store.getSnapshot().data.transactions.length, 5);
});

test('saldo considera histórico e mês usa data civil local, inclusive virada de ano e ano bissexto', () => {
  assert.equal(localDate(date), '2026-11-03');
  assert.equal(isCivilDate('2024-02-29'), true);
  assert.equal(isCivilDate('2026-02-29'), false);
  assert.deepEqual(summarize([
    { ...input, id: 'old', type: 'income', amountCents: 10000, date: '2025-12-31' },
    { ...input, id: 'current', amountCents: 10, date: '2026-01-01' },
    { ...input, id: 'cents', amountCents: 20, date: '2026-01-31' },
  ], '2026-01'), { balanceCents: 9970, incomeCents: 0, expenseCents: 30 });
  assert.throws(() => summarize([], '2026-13'));
});

test('dados persistidos com IDs duplicados, referências inválidas ou estouro de precisão são recusados', () => {
  const duplicate = seed();
  duplicate.transactions.push({ ...duplicate.transactions[0] });
  assert.throws(() => validateFinanceData(duplicate));
  const broken = seed();
  broken.transactions[0].categoryId = 'missing';
  assert.throws(() => validateFinanceData(broken));
  const large = seed();
  large.transactions[0].amountCents = Number.MAX_SAFE_INTEGER;
  assert.throws(() => validateFinanceData(large));
});

test('snapshot é imutável para impedir alterações fora das ações persistidas', async () => {
  const { store } = fixture();
  await store.initialize();
  assert.throws(() => { store.getSnapshot().data.transactions.push(input); }, TypeError);
  assert.throws(() => { store.getSnapshot().data.preferences.hideAmounts = true; }, TypeError);
});

test('preferências suportam e validam dia de recebimento de renda', async () => {
  const { store } = fixture();
  await store.initialize();
  assert.equal(store.getSnapshot().data.preferences.incomeDay, undefined);

  await store.updatePreferences({ incomeDay: 5 });
  assert.equal(store.getSnapshot().data.preferences.incomeDay, 5);

  await store.updatePreferences({ incomeDay: null });
  assert.equal(store.getSnapshot().data.preferences.incomeDay, null);

  const invalidZero = seed();
  invalidZero.preferences.incomeDay = 0;
  assert.throws(() => validateFinanceData(invalidZero), /Dia de recebimento inválido/);

  const invalidOver = seed();
  invalidOver.preferences.incomeDay = 32;
  assert.throws(() => validateFinanceData(invalidOver), /Dia de recebimento inválido/);

  const invalidFloat = seed();
  invalidFloat.preferences.incomeDay = 5.5;
  assert.throws(() => validateFinanceData(invalidFloat), /Dia de recebimento inválido/);
});
