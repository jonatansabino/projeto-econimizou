import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarDays, maskMoney, validateDraft } from '../src/domain/transaction-form.ts';
import { parseMoney } from '../src/domain/features.ts';
import { createMockData } from '../src/data/mock-data.ts';

test('máscara brasileira preserva centavos, milhares e apagar conteúdo', () => {
  assert.equal(maskMoney('1'), 'R$ 0,01');
  assert.equal(maskMoney('4500'), 'R$ 45,00');
  assert.equal(maskMoney('1.234,56'), 'R$ 1.234,56');
  assert.equal(maskMoney('R$ 0,010'), 'R$ 0,10');
  assert.equal(maskMoney(''), '');
  assert.equal(parseMoney(maskMoney(String(Number.MAX_SAFE_INTEGER))), Number.MAX_SAFE_INTEGER);
});
test('validação individual não produz transação parcial e exige categoria compatível', () => {
  const categories = createMockData().categories;
  const draft = { type: 'expense', description: '', value: '', date: '31/02/2026', categoryId: 'salary' };
  const invalid = validateDraft(draft, categories);
  assert.deepEqual(Object.keys(invalid.errors), ['description', 'value', 'date', 'categoryId']);
  assert.equal(invalid.input, undefined);
  const valid = validateDraft({ ...draft, description: ' Almoço ', value: 'R$ 45,00', date: '03/11/2026', categoryId: 'food' }, categories);
  assert.equal(valid.input.amountCents, 4500); assert.equal(valid.input.description, 'Almoço');
});
test('calendário local respeita anos bissextos e dias de cada mês', () => {
  assert.equal(calendarDays(2024, 2).filter(Boolean).length, 29);
  assert.equal(calendarDays(2026, 2).filter(Boolean).length, 28);
  assert.equal(calendarDays(2026, 11).filter(Boolean)[0], '2026-11-01');
});
