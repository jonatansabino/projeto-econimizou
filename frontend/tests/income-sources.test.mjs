import test from 'node:test';
import assert from 'node:assert/strict';

import { totalIncomeSources, newIncomeSourceId, validateFinanceData } from '../src/domain/finance.ts';

// --- totalIncomeSources ---

test('totalIncomeSources soma centavos de todas as fontes', () => {
  const sources = [
    { id: 's1', label: 'Salário 1a quinzena', amountCents: 300000, dayOfMonth: 30 },
    { id: 's2', label: 'Salário 2a quinzena', amountCents: 200000, dayOfMonth: 15 },
  ];
  assert.equal(totalIncomeSources(sources), 500000);
});

test('totalIncomeSources retorna 0 para lista vazia', () => {
  assert.equal(totalIncomeSources([]), 0);
});

test('totalIncomeSources soma múltiplas fontes com e sem dia', () => {
  const sources = [
    { id: 'a', label: 'Freelance', amountCents: 50000, dayOfMonth: null },
    { id: 'b', label: 'Salário', amountCents: 400000, dayOfMonth: 5 },
    { id: 'c', label: 'Aluguel', amountCents: 80000, dayOfMonth: 20 },
  ];
  assert.equal(totalIncomeSources(sources), 530000);
});

// --- newIncomeSourceId ---

test('newIncomeSourceId gera IDs distintos em chamadas seguidas', () => {
  const ids = new Set(Array.from({ length: 20 }, () => newIncomeSourceId()));
  assert.equal(ids.size, 20, 'IDs devem ser únicos');
});

test('newIncomeSourceId começa com src-', () => {
  const id = newIncomeSourceId();
  assert.ok(id.startsWith('src-'), `ID deve começar com src-, mas foi: ${id}`);
});

// --- validateFinanceData com incomeSources ---

function baseData(overrides = {}) {
  return {
    version: 2,
    profile: { name: 'Teste', avatar: 'avatar-01' },
    preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true },
    categories: [],
    transactions: [],
    goals: [],
    chatMessages: [],
    recommendations: [],
    notifications: [],
    ...overrides,
  };
}

test('validateFinanceData aceita incomeSources ausente (retrocompatível)', () => {
  assert.doesNotThrow(() => validateFinanceData(baseData()));
});

test('validateFinanceData aceita incomeSources vazio', () => {
  assert.doesNotThrow(() =>
    validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: [] } }))
  );
});

test('validateFinanceData aceita lista válida de fontes de renda', () => {
  const sources = [
    { id: 's1', label: 'Salário', amountCents: 300000, dayOfMonth: 30 },
    { id: 's2', label: 'Freelance', amountCents: 100000, dayOfMonth: null },
  ];
  assert.doesNotThrow(() =>
    validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources } }))
  );
});

test('validateFinanceData rejeita fonte com amountCents zero', () => {
  const sources = [{ id: 's1', label: 'Salário', amountCents: 0, dayOfMonth: null }];
  assert.throws(
    () => validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources } })),
    /Fonte de renda inválida/
  );
});

test('validateFinanceData rejeita fonte sem label', () => {
  const sources = [{ id: 's1', label: '', amountCents: 100000, dayOfMonth: null }];
  assert.throws(
    () => validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources } })),
    /Fonte de renda inválida/
  );
});

test('validateFinanceData rejeita dayOfMonth fora do intervalo 1-31', () => {
  const sources = [{ id: 's1', label: 'Salário', amountCents: 100000, dayOfMonth: 0 }];
  assert.throws(
    () => validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources } })),
    /Dia de recebimento da fonte de renda inválido/
  );
  const sources2 = [{ id: 's2', label: 'Salário', amountCents: 100000, dayOfMonth: 32 }];
  assert.throws(
    () => validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources2 } })),
    /Dia de recebimento da fonte de renda inválido/
  );
});

test('validateFinanceData rejeita IDs duplicados em incomeSources', () => {
  const sources = [
    { id: 'dup', label: 'Fonte 1', amountCents: 100000, dayOfMonth: null },
    { id: 'dup', label: 'Fonte 2', amountCents: 200000, dayOfMonth: null },
  ];
  assert.throws(
    () => validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources } })),
    /IDs duplicados/
  );
});

test('validateFinanceData aceita dayOfMonth nos extremos válidos (1 e 31)', () => {
  const sources = [
    { id: 's1', label: 'Renda 1', amountCents: 100000, dayOfMonth: 1 },
    { id: 's2', label: 'Renda 2', amountCents: 200000, dayOfMonth: 31 },
  ];
  assert.doesNotThrow(() =>
    validateFinanceData(baseData({ preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true, incomeSources: sources } }))
  );
});
