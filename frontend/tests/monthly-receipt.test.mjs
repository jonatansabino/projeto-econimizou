import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateMonthlyReceipt,
  formatMonthYear,
  monthlyIncomeReceived,
} from '../src/domain/monthly-receipt.ts';
import { formatMoney } from '../src/domain/finance.ts';

test('Cenário 1: Renda prevista de R$ 5.000 e recebida de R$ 3.000 resulta em 60%', () => {
  const plannedCents = 500000; // R$ 5.000,00
  const receivedCents = 300000; // R$ 3.000,00
  const month = '2026-11';

  const progress = calculateMonthlyReceipt(plannedCents, receivedCents, month);
  assert.ok(progress !== null);
  assert.equal(progress.plannedCents, 500000);
  assert.equal(progress.receivedCents, 300000);
  assert.equal(progress.percent, 60);
  assert.equal(progress.visualPercent, 60);
  assert.equal(progress.differenceCents, 200000);
  assert.equal(progress.remainingCents, 200000);
  assert.equal(progress.surplusCents, 0);
  assert.equal(progress.isExceeded, false);
  assert.equal(progress.isReached, false);
  assert.equal(progress.referenceMonthLabel, 'Novembro de 2026');
  assert.equal(progress.message, 'Você registrou 60% da sua renda prevista neste mês.');
});

test('Cenário 2: Renda prevista de R$ 5.000 e recebida de R$ 5.500 resulta em 110% com barra visual em 100%', () => {
  const plannedCents = 500000; // R$ 5.000,00
  const receivedCents = 550000; // R$ 5.500,00
  const month = '2026-11';

  const progress = calculateMonthlyReceipt(plannedCents, receivedCents, month);
  assert.ok(progress !== null);
  assert.equal(progress.plannedCents, 500000);
  assert.equal(progress.receivedCents, 550000);
  assert.equal(progress.percent, 110);
  assert.equal(progress.visualPercent, 100);
  assert.equal(progress.differenceCents, 50000);
  assert.equal(progress.surplusCents, 50000);
  assert.equal(progress.remainingCents, 0);
  assert.equal(progress.isExceeded, true);
  assert.equal(progress.isReached, false);
  assert.ok(progress.message.includes('superou sua renda prevista'));
  assert.ok(progress.message.includes('500,00'));
});

test('Cenário 3: Renda prevista e nenhuma receita resulta em 0%', () => {
  const plannedCents = 500000; // R$ 5.000,00
  const receivedCents = 0;
  const month = '2026-11';

  const progress = calculateMonthlyReceipt(plannedCents, receivedCents, month);
  assert.ok(progress !== null);
  assert.equal(progress.percent, 0);
  assert.equal(progress.visualPercent, 0);
  assert.equal(progress.receivedCents, 0);
  assert.equal(progress.remainingCents, 500000);
  assert.equal(progress.isExceeded, false);
  assert.equal(progress.isReached, false);
  assert.equal(progress.message, 'Você registrou 0% da sua renda prevista neste mês.');
});

test('Cenário 4: Renda não informada ou zero oculta o card (retorna null)', () => {
  assert.equal(calculateMonthlyReceipt(null, 300000, '2026-11'), null);
  assert.equal(calculateMonthlyReceipt(undefined, 300000, '2026-11'), null);
  assert.equal(calculateMonthlyReceipt(0, 300000, '2026-11'), null);
  assert.equal(calculateMonthlyReceipt(-100, 300000, '2026-11'), null);
});

test('Cenário 5: Alteração de renda prevista recalcula percentual e metas', () => {
  const receivedCents = 300000; // R$ 3.000,00
  const month = '2026-11';

  const initial = calculateMonthlyReceipt(600000, receivedCents, month);
  assert.equal(initial?.percent, 50);

  const updated = calculateMonthlyReceipt(300000, receivedCents, month);
  assert.equal(updated?.percent, 100);
  assert.equal(updated?.visualPercent, 100);
  assert.equal(updated?.isReached, true);
  assert.equal(updated?.remainingCents, 0);
  assert.equal(updated?.surplusCents, 0);
  assert.equal(updated?.message, 'Você atingiu 100% da sua renda prevista neste mês!');
});

test('Cenários 6 e 7: Cadastro, edição, exclusão e troca de mês filtram receitas por mês', () => {
  const transactions = [
    {
      id: 't1',
      description: 'Salário Novembro',
      amountCents: 300000,
      type: 'income',
      categoryId: 'cat1',
      date: '2026-11-05',
    },
    {
      id: 't2',
      description: 'Freelance Novembro',
      amountCents: 100000,
      type: 'income',
      categoryId: 'cat1',
      date: '2026-11-20',
    },
    {
      id: 't3',
      description: 'Aluguel Novembro (despesa não entra)',
      amountCents: 150000,
      type: 'expense',
      categoryId: 'cat2',
      date: '2026-11-10',
    },
    {
      id: 't4',
      description: 'Salário Outubro',
      amountCents: 400000,
      type: 'income',
      categoryId: 'cat1',
      date: '2026-10-05',
    },
  ];

  // Novembro
  const novReceived = monthlyIncomeReceived(transactions, '2026-11');
  assert.equal(novReceived, 400000); // 3000 + 1000

  const novProgress = calculateMonthlyReceipt(500000, novReceived, '2026-11');
  assert.equal(novProgress?.percent, 80);

  // Troca de mês para Outubro
  const octReceived = monthlyIncomeReceived(transactions, '2026-10');
  assert.equal(octReceived, 400000);
  const octProgress = calculateMonthlyReceipt(500000, octReceived, '2026-10');
  assert.equal(octProgress?.referenceMonthLabel, 'Outubro de 2026');

  // Mês sem receitas (Dezembro)
  const decReceived = monthlyIncomeReceived(transactions, '2026-12');
  assert.equal(decReceived, 0);
  const decProgress = calculateMonthlyReceipt(500000, decReceived, '2026-12');
  assert.equal(decProgress?.percent, 0);

  // Edição de receita: t1 alterada de 3000 para 4500
  const editedTransactions = transactions.map((t) =>
    t.id === 't1' ? { ...t, amountCents: 450000 } : t
  );
  const editedReceived = monthlyIncomeReceived(editedTransactions, '2026-11');
  assert.equal(editedReceived, 550000);
  const editedProgress = calculateMonthlyReceipt(500000, editedReceived, '2026-11');
  assert.equal(editedProgress?.percent, 110);
  assert.equal(editedProgress?.visualPercent, 100);

  // Exclusão de receita: t2 removida
  const deletedTransactions = transactions.filter((t) => t.id !== 't2');
  const deletedReceived = monthlyIncomeReceived(deletedTransactions, '2026-11');
  assert.equal(deletedReceived, 300000);
  const deletedProgress = calculateMonthlyReceipt(500000, deletedReceived, '2026-11');
  assert.equal(deletedProgress?.percent, 60);
});

test('Formatação de mês por extenso cobre todos os meses do ano', () => {
  assert.equal(formatMonthYear('2026-01'), 'Janeiro de 2026');
  assert.equal(formatMonthYear('2026-06'), 'Junho de 2026');
  assert.equal(formatMonthYear('2026-12'), 'Dezembro de 2026');
  assert.equal(formatMonthYear('invalid'), 'invalid');
});

test('Cenário 8: Respeito à preferência de ocultar valores', () => {
  const hideAmounts = true;
  const progress = calculateMonthlyReceipt(500000, 300000, '2026-11');
  assert.ok(progress !== null);

  const display = (cents) => (hideAmounts ? '••••••' : formatMoney(cents));
  assert.equal(display(progress.plannedCents), '••••••');
  assert.equal(display(progress.receivedCents), '••••••');
  assert.equal(display(progress.remainingCents), '••••••');

  // Não exibe moeda em texto desmascarada
  assert.ok(!display(progress.plannedCents).includes('5.000'));
});
