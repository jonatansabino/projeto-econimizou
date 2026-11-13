import assert from 'node:assert/strict';
import { test } from 'node:test';
import { birthDateParts, birthDateOptions, selectBirthDatePart } from '../src/domain/birth-date.ts';
import { validatePersonalization } from '../src/domain/personalization.ts';

const today = '2026-11-13';
test('nascimento opcional, ordem independente e saída civil YYYY-MM-DD', () => {
  assert.deepEqual(birthDateParts(''), { day: '', month: '', year: '' });
  let date = selectBirthDatePart('', 'day', '29', today);
  date = selectBirthDatePart(date, 'month', '02', today);
  assert.ok(validatePersonalization({ birth_date: date, financial_objective: '', monthly_income_cents: '' }, today).errors.birth_date);
  date = selectBirthDatePart(date, 'year', '2000', today);
  assert.equal(date, '2000-02-29');
  assert.equal(validatePersonalization({ birth_date: date, financial_objective: '', monthly_income_cents: '' }, today).input.birth_date, date);
  assert.equal(validatePersonalization({ birth_date: '', financial_objective: '', monthly_income_cents: '' }, today).input.birth_date, null);
});
test('fevereiro considera bissextos, inclusive séculos', () => {
  for (const [year, days] of [['1900', 28], ['2000', 29], ['2024', 29], ['2025', 28]]) assert.equal(birthDateOptions(`${year}-02-`, today).day.length, days);
  assert.equal(birthDateOptions('-02-', today).day.length, 29);
});
test('alterar mês ou ano limpa dia inválido em vez de salvar outra data', () => {
  assert.equal(selectBirthDatePart('2024-02-29', 'year', '2025', today), '2025-02-');
  assert.equal(selectBirthDatePart('2000-01-31', 'month', '04', today), '2000-04-');
  assert.equal(selectBirthDatePart('2000-01-30', 'month', '04', today), '2000-04-30');
  assert.equal(selectBirthDatePart('2000-01-31', 'day', '32', today), '2000-01-31');
});
test('opções e transições impedem ano, mês e dia futuros', () => {
  const options = birthDateOptions('2026-11-', today);
  assert.equal(options.year[0], '2026'); assert.equal(options.year.at(-1), '1900');
  assert.equal(options.month.at(-1), '11'); assert.equal(options.day.at(-1), '13');
  assert.equal(selectBirthDatePart('2026-11-13', 'day', '14', today), '2026-11-13');
  assert.equal(selectBirthDatePart('2026-11-13', 'month', '12', today), '2026-11-13');
  assert.equal(selectBirthDatePart('2026-11-13', 'year', '2027', today), '2026-11-13');
  assert.equal(selectBirthDatePart('2025-12-31', 'year', '2026', today), '2026--');
  assert.equal(selectBirthDatePart('2025-11-30', 'year', '2026', today), '2026-11-');
});
