import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, validateAuthForm } from '../src/domain/auth.ts';
import { createAuthStore } from '../src/state/auth-store.ts';
import { createAuthApi, validateApiUrl } from '../src/data/auth-api.ts';
import { createAccountFinanceRepository, accountStorageKey } from '../src/data/account-finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { FINANCE_STORAGE_KEY } from '../src/data/finance-repository.ts';

const user = { id: '1', name: 'Ana', email: 'ana@example.test', avatar: 'dicebear:adventurer:2' };
const other = { ...user, id: '2', name: 'Bia' };
function fixture(web = false) {
  let saved = null; let configuredToken = null; let calls = 0;
  const result = { user, access_token: 'test-token', expires_at: '2099-01-01T00:00:00Z' };
  const api = { setToken: value => { configuredToken = value; }, me: async () => { calls++; if (!web && !configuredToken) throw new ApiError('Invalid', 401); return result; }, login: async () => result, register: async () => result, logout: async () => {}, profile: async profile => ({ user: { ...user, ...profile } }) };
  const storage = { get: async () => saved, set: async value => { saved = value; }, clear: async () => { saved = null; } };
  return { store: createAuthStore(api, storage, web), api, storage, token: () => saved, calls: () => calls };
}

test('validação de cadastro identifica nome, email, senha e confirmação', () => {
  const errors = validateAuthForm({ name: '', email: 'x', password: 'a', password_confirmation: 'b' }, true);
  assert.equal(Object.keys(errors).length, 4);
  assert.deepEqual(validateAuthForm({ name: 'Ana', email: 'ana@example.test', password: 'SenhaSegura!28', password_confirmation: 'SenhaSegura!28' }, true), {});
});

test('URL exige HTTPS fora de desenvolvimento local e rejeita credenciais em URL', () => {
  assert.equal(validateApiUrl('https://api.example.test/'), 'https://api.example.test');
  assert.equal(validateApiUrl('http://10.0.2.2:8080', true), 'http://10.0.2.2:8080');
  assert.throws(() => validateApiUrl('http://api.example.test', true));
  assert.throws(() => validateApiUrl('http://localhost:8080'));
  assert.throws(() => validateApiUrl('https://user:password@api.example.test'));
});

test('sessão nativa só é liberada após persistir token e é validada na restauração', async () => {
  const f = fixture(); await f.store.restore(); assert.equal(f.store.getSnapshot().status, 'signedOut');
  await f.store.login({ email: user.email, password: 'não-persistida' });
  assert.equal(f.token(), 'test-token'); assert.equal(f.store.getSnapshot().status, 'signedIn');
  const restarted = createAuthStore(f.api, f.storage, false); await Promise.all([restarted.restore(), restarted.restore()]);
  assert.equal(f.calls(), 1); assert.deepEqual(restarted.getSnapshot().user, user);
  assert.doesNotMatch(JSON.stringify(restarted.getSnapshot()), /test-token|não-persistida/);
});

test('falha do armazenamento seguro não publica sessão autenticada', async () => {
  const f = fixture(); await f.store.restore(); f.storage.set = async () => { throw new Error('disk'); };
  await assert.rejects(f.store.login({ email: user.email, password: 'senha' }));
  assert.equal(f.store.getSnapshot().status, 'signedOut');
});

test('token inválido é removido; falha de rede na restauração bloqueia finanças', async () => {
  const f = fixture(); await f.store.login({ email: user.email, password: 'senha' });
  f.api.me = async () => { throw new ApiError('revoked', 401); };
  const invalid = createAuthStore(f.api, f.storage, false); await invalid.restore();
  assert.equal(f.token(), null); assert.equal(invalid.getSnapshot().status, 'signedOut');
  await f.storage.set('still-stored'); f.api.me = async () => { throw new ApiError('offline'); };
  const offline = createAuthStore(f.api, f.storage, false); await offline.restore();
  assert.equal(offline.getSnapshot().status, 'networkError'); assert.equal(offline.getSnapshot().user, null); assert.equal(f.token(), 'still-stored');
});

test('web restaura cookie via me e não utiliza token storage', async () => {
  const f = fixture(true); f.storage.set = async () => { throw new Error('never'); };
  await f.store.login({ email: user.email, password: 'senha' });
  assert.equal(f.token(), null); await f.store.restore(); assert.equal(f.store.getSnapshot().status, 'signedIn');
});

test('logout só termina após revogação; rede falha mantém sessão para nova tentativa', async () => {
  const f = fixture(); await f.store.login({ email: user.email, password: 'senha' });
  f.api.logout = async () => { throw new ApiError('offline'); };
  await assert.rejects(f.store.logout()); assert.equal(f.store.getSnapshot().status, 'signedIn');
  f.api.logout = async () => {}; await f.store.logout();
  assert.equal(f.token(), null); assert.equal(f.store.getSnapshot().status, 'signedOut');
});

test('checagem de sessão revogada limpa token e fecha acesso', async () => {
  const f = fixture(); await f.store.login({ email: user.email, password: 'senha' });
  f.api.me = async () => { throw new ApiError('expired', 401); }; await f.store.refresh();
  assert.equal(f.store.getSnapshot().status, 'signedOut'); assert.equal(f.token(), null);
});

test('cliente envia Bearer nativo e credenciais web com CSRF, sem armazenamento no navegador', async () => {
  const calls = [];
  const transport = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(url.endsWith('/csrf') ? { csrf_token: 'csrf' } : { user, access_token: 'test-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  const native = createAuthApi({ url: 'https://api.example.test', web: false, transport }); native.setToken('test-token'); await native.me();
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token'); assert.equal(calls[0].options.credentials, 'omit');
  const web = createAuthApi({ url: 'https://api.example.test', web: true, transport }); await web.login({ email: user.email, password: 'senha' });
  assert.equal(calls[2].options.headers['X-CSRF-Token'], 'csrf'); assert.equal(calls[2].options.credentials, 'include'); assert.equal(calls[2].options.headers.Authorization, undefined);
});

test('finanças são isoladas por conta e API; legado permanece intacto e não é importado', async () => {
  const legacy = createMockData(); legacy.profile.avatar = '💰'; legacy.onboarding.completed = true;
  const raw = JSON.stringify(legacy); const map = new Map([[FINANCE_STORAGE_KEY, raw]]);
  const storage = { getItem: async key => map.get(key) ?? null, setItem: async (key, value) => { map.set(key, value); } };
  const a = createAccountFinanceRepository(storage, 'https://one.example', user);
  const data = await a.load(); assert.equal(data.transactions.length, 0); assert.equal(data.goals.length, 0); assert.equal(data.profile.name, user.name); assert.equal(data.onboarding.completed, true);
  const changed = { ...data, goals: [{ id: 'local-goal', name: 'Videogame', targetCents: 10000, savedCents: 0 }] }; await a.save(changed);
  const b = await createAccountFinanceRepository(storage, 'https://one.example', other).load(); assert.equal(b.goals.length, 0);
  const otherApi = await createAccountFinanceRepository(storage, 'https://two.example', user).load(); assert.equal(otherApi.goals.length, 0);
  assert.equal((await a.load()).goals.length, 1); assert.equal(map.get(FINANCE_STORAGE_KEY), raw);
  assert.notEqual(accountStorageKey('https://one.example', user.id), accountStorageKey('https://one.example', other.id));
});

test('corrupção em dados antigos é preservada sem bloquear conta nova', async () => {
  const map = new Map([[FINANCE_STORAGE_KEY, '{broken']]);
  const storage = { getItem: async key => map.get(key) ?? null, setItem: async (key,value) => { map.set(key,value); } };
  const data = await createAccountFinanceRepository(storage, 'https://api.example', user).load();
  assert.equal(data.transactions.length, 0); assert.equal(map.get(FINANCE_STORAGE_KEY), '{broken');
});

test('resposta atrasada de perfil não reabre sessão após logout', async () => {
  const f = fixture(); await f.store.login({ email: user.email, password: 'senha' });
  let finish;
  f.api.profile = () => new Promise(resolve => { finish = resolve; });
  const pending = f.store.updateProfile({ name: 'Nome novo', avatar: user.avatar });
  await f.store.logout(); finish({ user: { ...user, name: 'Nome novo' } }); await pending;
  assert.equal(f.store.getSnapshot().status, 'signedOut'); assert.equal(f.store.getSnapshot().user, null);
});

test('resposta antiga de me não interfere na conta que acabou de entrar', async () => {
  const f = fixture(); await f.store.login({ email: user.email, password: 'senha' });
  let finish;
  f.api.me = () => new Promise(resolve => { finish = resolve; });
  const pending = f.store.refresh(); await f.store.logout();
  f.api.login = async () => ({ user: other, access_token: 'other-test-token' });
  await f.store.login({ email: other.email, password: 'senha' });
  finish({ user }); await pending;
  assert.equal(f.store.getSnapshot().user.id, other.id); assert.equal(f.token(), 'other-test-token');
});

test('web não libera a sessão se o navegador não aceitar o cookie', async () => {
  const f = fixture(true); f.api.me = async () => { throw new ApiError('missing cookie', 401); };
  await f.store.restore(); await assert.rejects(f.store.login({ email: user.email, password: 'senha' }), /cookies/);
  assert.equal(f.store.getSnapshot().status, 'signedOut');
});

test('snapshot de autenticação descarta propriedades sensíveis inesperadas da resposta', async () => {
  const f = fixture();
  f.api.login = async () => ({ user: { ...user, password: 'should-not-be-kept', secret: 'hidden' }, access_token: 'test-token' });
  await f.store.login({ email: user.email, password: 'senha' });
  assert.deepEqual(f.store.getSnapshot().user, user);
  assert.doesNotMatch(JSON.stringify(f.store.getSnapshot()), /should-not-be-kept|hidden|test-token/);
});
