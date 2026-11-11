import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availablePeriods, categoryColor, financialReport, reportRange, pieSegmentAt } from '../src/domain/analytics.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

const categories = createMockData().categories;
const transaction = (id, date, type, amountCents, categoryId = type === 'income' ? 'salary' : 'food') => ({ id, description: id, date, type, amountCents, categoryId });
const history = [transaction('opening', '2025-12-31', 'income', 10000), transaction('jan', '2026-01-02', 'expense', 3000), transaction('march', '2026-03-04', 'income', 5000)];

test('saldo mensal inclui histórico anterior, meses sem movimentos e virada de ano', () => {
  const report = financialReport(history, categories, { start: '2026-01-01', end: '2026-03-31' });
  assert.equal(report.incomeCents, 5000); assert.equal(report.expenseCents, 3000); assert.equal(report.netCents, 2000);
  assert.deepEqual(report.monthly.map((item) => item.balanceCents), [7000, 7000, 12000]);
  assert.deepEqual(report.monthly.map((item) => item.month), ['2026-01', '2026-02', '2026-03']);
});
test('intervalo parcial filtra movimentos sem descartar saldo anterior ou incluir futuro', () => {
  const data = [...history, transaction('late', '2026-03-25', 'expense', 9000)];
  const report = financialReport(data, categories, { start: '2026-03-03', end: '2026-03-10' });
  assert.equal(report.transactions.length, 1); assert.equal(report.monthly[0].balanceCents, 12000);
  const partial = financialReport(data, categories, { start: '2026-03-20', end: '2026-03-31' });
  assert.equal(partial.monthly[0].balanceCents, 3000); assert.equal(partial.netCents, -9000);
});
test('categorias somam despesas, percentuais totalizam 100 e cores permanecem após renomear', () => {
  const data = [...history, transaction('home', '2026-01-10', 'expense', 1000, 'home')];
  const report = financialReport(data, categories);
  assert.equal(report.segments.reduce((total, item) => total + item.total, 0), report.expenseCents);
  assert.equal(report.segments.reduce((total, item) => total + item.percent, 0), 100);
  const renamed = financialReport(data, categories.map((category) => ({ ...category, name: category.name + ' nova' })));
  assert.equal(renamed.segments[0].color, report.segments[0].color);
  assert.equal(categoryColor('food'), categoryColor('food'));
});
test('períodos disponíveis, filtro anual, fevereiro bissexto, saldo negativo e vazio', () => {
  assert.deepEqual(availablePeriods(history, '2026-11-03').years, ['2026', '2025']);
  assert.deepEqual(reportRange('selectedMonth', '2024-02', '2024'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(reportRange('year', '2026-01', '2026'), { start: '2026-01-01', end: '2026-12-31' });
  assert.equal(financialReport([transaction('negative', '2026-01-01', 'expense', 200)], categories).monthly[0].balanceCents, -200);
  assert.equal(financialReport([], categories).monthly.length, 0);
  assert.throws(() => reportRange('selectedMonth', '2026-13', '2026'));
});
test('dados dos gráficos recalculam após CRUD e permanecem consistentes depois da recarga', async () => {
  let raw = null;
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; } });
  const store = createFinanceStore(repository); await store.initialize();
  const draft = { description: 'Teste gráfico', type: 'expense', categoryId: 'food', date: '2026-11-03', amountCents: 4500 };
  const before = financialReport(store.getSnapshot().data.transactions, categories);
  const id = await store.addTransaction(draft);
  assert.equal(financialReport(store.getSnapshot().data.transactions, categories).expenseCents, before.expenseCents + 4500);
  await store.updateTransaction(id, { ...draft, amountCents: 2500 });
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.equal(financialReport(restarted.getSnapshot().data.transactions, categories).expenseCents, before.expenseCents + 2500);
  await store.deleteTransaction(id);
  assert.deepEqual(financialReport(store.getSnapshot().data.transactions, categories), before);
});

test('toque em fatias usa coordenadas locais e rejeita centro e áreas externas', () => {
  assert.equal(pieSegmentAt(0, 0, 100, 60, [50, 50]), -1);
  assert.equal(pieSegmentAt(120, 0, 100, 60, [50, 50]), -1);
  assert.equal(pieSegmentAt(80, 0, 100, 60, [50, 50]), 0);
  assert.equal(pieSegmentAt(-80, 0, 100, 60, [50, 50]), 1);
});
