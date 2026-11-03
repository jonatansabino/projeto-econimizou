import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avatarCatalog, DEFAULT_AVATAR, resolveAvatar } from '../src/domain/avatar.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

test('galeria contém SVGs locais distintos e identificadores estáveis', () => {
  assert.equal(avatarCatalog.length, 12);
  assert.equal(new Set(avatarCatalog.map((avatar) => avatar.id)).size, 12);
  assert.equal(new Set(avatarCatalog.map((avatar) => avatar.xml)).size, 12);
  for (const avatar of avatarCatalog) {
    assert.match(avatar.xml, /^<svg\b/);
    assert.doesNotMatch(avatar.xml, /<(?:script|image|foreignObject)\b/i);
    assert.equal(resolveAvatar(avatar.id), avatar);
  }
  assert.equal(resolveAvatar(DEFAULT_AVATAR).id, createMockData().profile.avatar);
});

test('emojis antigos e identificadores desconhecidos têm representação local determinística', () => {
  for (const value of ['💰', '🚀', '🌿', 'avatar antigo', '', 'dicebear:unknown']) {
    assert.equal(resolveAvatar(value), resolveAvatar(value));
    assert.ok(avatarCatalog.includes(resolveAvatar(value)));
  }
});

test('salvar avatar preserva dados financeiros e restaura a escolha ao reiniciar', async () => {
  const original = createMockData(); original.profile.avatar = '💰';
  let raw = JSON.stringify(original);
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; } });
  const store = createFinanceStore(repository); await store.initialize();
  assert.equal(store.getSnapshot().data.profile.avatar, '💰');
  await store.updateProfile({ ...original.profile, avatar: avatarCatalog[1].id });
  const restarted = createFinanceStore(repository); await restarted.initialize();
  assert.equal(restarted.getSnapshot().data.profile.avatar, avatarCatalog[1].id);
  assert.deepEqual(restarted.getSnapshot().data.transactions, original.transactions);
  assert.deepEqual(restarted.getSnapshot().data.goals, original.goals);
});
