import assert from 'node:assert/strict';
import { test } from 'node:test';
import { personalizationDraft, validatePersonalization, passwordStrength } from '../src/domain/personalization.ts';
import { validateAuthForm, validateAuthUser } from '../src/domain/auth.ts';
import { createAuthStore } from '../src/state/auth-store.ts';

const blank = { birth_date: '', financial_objective: '', monthly_income_cents: '' };
test('personalização permite omitir tudo e renda zero sem lançar receita', () => {
  assert.deepEqual(validatePersonalization(blank).input, { birth_date: null, financial_objective: null, monthly_income_cents: null });
  assert.equal(validatePersonalization({ ...blank, monthly_income_cents: 'R$ 0,00' }).input.monthly_income_cents, 0);
});
test('datas civis consideram dia, mês e ano e recusam futuro', () => {
  assert.ok(validatePersonalization({ ...blank, birth_date: '2000-02-29' }, '2026-11-13').input);
  for (const date of ['2001-02-29', '2026-11-14', '1899-12-31', '2026-13-01']) assert.ok(validatePersonalization({ ...blank, birth_date: date }, '2026-11-13').errors.birth_date);
  assert.ok(validatePersonalization({ ...blank, birth_date: '2026-11-13' }, '2026-11-13').input);
});
test('renda mantém centavos exatos e preferências fazem round-trip', () => {
  const profile = { birth_date: '1995-05-12', financial_objective: 'achievement', monthly_income_cents: 520000, completed: true };
  const result = validatePersonalization(personalizationDraft(profile));
  assert.deepEqual(result.input, { birth_date: profile.birth_date, financial_objective: profile.financial_objective, monthly_income_cents: 520000 });
  assert.ok(validatePersonalization({ ...blank, monthly_income_cents: 'R$ 90.071.992.547.409,92' }).errors.monthly_income_cents);
  assert.ok(validatePersonalization({ ...blank, financial_objective: 'inválido' }).errors.financial_objective);
});
test('força é orientativa e cadastro respeita mínimo, confirmação e limite em bytes', () => {
  assert.equal(passwordStrength('').score, 0); assert.equal(passwordStrength('12345678').label, 'Fraca');
  assert.equal(passwordStrength('RioVerde!7824#').label, 'Forte');
  assert.ok(validateAuthForm({ name: 'Ana', email: 'ana@example.test', password: 'é'.repeat(37), password_confirmation: 'é'.repeat(37) }, true).password);
  assert.ok(validateAuthForm({ name: 'Ana', email: 'ana@example.test', password: 'RioVerde!7824#', password_confirmation: '' }, true).password_confirmation);
});
test('metadados são validados sem aceitar renda fora da precisão', () => {
  const user = { id: '1', name: 'Ana', email: 'ana@example.test', avatar: 'dicebear:adventurer:1', personalization: { birth_date: null, financial_objective: null, monthly_income_cents: null, completed: false } };
  validateAuthUser(user);
  assert.throws(() => validateAuthUser({ ...user, personalization: { ...user.personalization, monthly_income_cents: 9007199254740992 } }));
});
test('store preserva personalização e pular offline não invade outra conta', async () => {
  let user = { id: '1', name: 'Ana', email: 'ana@example.test', avatar: 'dicebear:adventurer:1', personalization: { birth_date: null, financial_objective: null, monthly_income_cents: null, completed: false } };
  const api = { setToken() {}, me: async () => ({ user }), register: async () => ({ user, access_token: 't' }), login: async () => ({ user, access_token: 't' }), logout: async () => {}, profile: async () => ({ user: { ...user, personalization: { ...user.personalization, financial_objective: 'save' } } }) };
  const store = createAuthStore(api, { get: async () => 't', set: async () => {}, clear: async () => {} }, false);
  await store.restore(); await store.updateProfile({ financial_objective: 'save' });
  assert.equal(store.getSnapshot().user.personalization.financial_objective, 'save');
  store.dismissPersonalization(); await store.refresh(); assert.equal(store.getSnapshot().user.personalization.completed, true);
  await store.logout(); user = { ...user, id: '2' }; await store.restore();
  assert.equal(store.getSnapshot().user.personalization.completed, false);
});
