import { expect, test, type Page } from '@playwright/test';
import { existingUser, TEST_API_URL } from './existing-user';
import { createMockData } from '../../src/data/mock-data';

const field = (page: Page, name: string) => page.getByLabel(name, { exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const password = 'RioVerde!7824#';
async function registerInUi(page: Page, name: string, email: string) {
  await button(page, 'Criar uma conta').click();
  await field(page, 'Nome completo').fill(name); await field(page, 'E-mail').fill(email);
  await field(page, 'Senha').fill(password); await field(page, 'Confirmar senha').fill(password);
  await button(page, 'Criar conta').click();
}
async function completeTutorial(page: Page) {
  await button(page, 'Pular').click(); await button(page, 'Começar').click();
}
async function logout(page: Page) {
  await page.getByRole('tab', { name: 'Ajustes', exact: true }).click();
  await button(page, 'Sair da conta').click();
  await expect(button(page, 'Entrar')).toBeVisible();
}

test('cadastro real, validações, senha visível, cookie HttpOnly, recarga e logout', async ({ page, context }) => {
  await page.goto('/extrato'); await expect(button(page, 'Entrar')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await button(page, 'Entrar').click();
  await expect(page.getByText('Informe um e-mail válido.', { exact: true })).toBeVisible();
  await expect(field(page, 'E-mail')).toBeFocused();
  await expect(page.getByText(/Esqueci minha senha/i)).toHaveCount(0);
  await field(page, 'Senha').fill(password); await button(page, 'Mostrar senha').click();
  await expect(field(page, 'Senha')).toHaveJSProperty('type', 'text'); await button(page, 'Ocultar senha').click();
  await expect(field(page, 'Senha')).toHaveJSProperty('type', 'password');
  await registerInUi(page, 'Ana', `ui-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`);
  await expect(page.getByRole('heading', { name: 'Boas-vindas ao Econimizou', exact: true })).toBeVisible();
  await completeTutorial(page);
  await expect(page.getByText('Olá, Ana 👋', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 0,00', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('Olá, Ana 👋', { exact: true })).toBeVisible();
  const cookie = (await context.cookies(`${TEST_API_URL}/api/auth/me`)).find((item) => item.name === 'economizou_session');
  expect(cookie?.httpOnly).toBe(true);
  const storage = await page.evaluate(() => ({ persistent: JSON.stringify({ ...localStorage, ...sessionStorage }), visibleCookies: document.cookie }));
  expect(storage.persistent).not.toContain(cookie!.value); expect(storage.persistent).not.toContain(password);
  expect(storage.visibleCookies).not.toContain('economizou_session');
  const before = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes(':account:')));
  await logout(page); await page.goto('/metas'); await expect(button(page, 'Entrar')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes(':account:')))).toEqual(before);
});

test('contas A/B usam arquivos diferentes, cadastro duplicado mostra erro e login recupera conta A', async ({ page }) => {
  const accountA = await existingUser(page); await page.goto('/');
  await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  await logout(page);
  await registerInUi(page, 'Outra conta', accountA.email);
  await expect(page.getByText('Este e-mail já está cadastrado.').first()).toBeVisible();
  await field(page, 'E-mail').fill(`bob-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`);
  await button(page, 'Criar conta').click(); await completeTutorial(page);
  await expect(page.getByText('Olá, Outra conta 👋', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 0,00', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes(':account:')).length)).toBe(2);
  await logout(page);
  await field(page, 'E-mail').fill(accountA.email); await field(page, 'Senha').fill(accountA.password); await button(page, 'Entrar').click();
  await expect(page.getByText('Olá, Jonatan 👋', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), accountA.key);
  expect(saved.transactions).toHaveLength(5); expect(saved.goals).toHaveLength(1);
});

test('dados anteriores permanecem intactos sem importação ou envio automático', async ({ page }) => {
  const old = createMockData(); old.onboarding = { completed: true }; old.profile.avatar = '💰';
  const raw = JSON.stringify(old);
  await page.addInitScript((value) => localStorage.setItem('@econimizou/finance', value), raw);
  const calls: string[] = []; page.on('request', (request) => { if (request.url().startsWith(TEST_API_URL)) calls.push(new URL(request.url()).pathname); });
  await page.goto('/'); await registerInUi(page, 'Conta nova', `new-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`);
  await expect(page.getByText('Olá, Conta nova 👋', { exact: true })).toBeVisible();
  await expect(page.getByText('Dados anteriores preservados', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 0,00', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('@econimizou/finance'))).toBe(raw);
  expect(calls.every((path) => path.startsWith('/api/auth/'))).toBe(true);
});

test('sessão ausente após recarga fecha as rotas e mantém registros financeiros', async ({ page, context }) => {
  const account = await existingUser(page); await page.goto('/');
  await expect(page.getByText('Olá, Jonatan 👋', { exact: true })).toBeVisible();
  const original = await page.evaluate((key) => localStorage.getItem(key), account.key);
  await context.clearCookies(); await page.reload(); await expect(button(page, 'Entrar')).toBeVisible();
  await expect(page.getByText('Olá, Jonatan 👋', { exact: true })).toHaveCount(0);
  await page.goto('/relatorios'); await expect(button(page, 'Entrar')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), account.key)).toBe(original);
});

test('falha de rede ao restaurar bloqueia finanças e permite reconectar', async ({ page }) => {
  await existingUser(page);
  await page.route('**/api/auth/me', (route) => route.abort());
  await page.goto('/metas'); await expect(button(page, 'Tentar conectar novamente')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.unroute('**/api/auth/me'); await button(page, 'Tentar conectar novamente').click();
  await expect(page.getByRole('heading', { name: 'Cada sonho, um plano.', exact: true })).toBeVisible();
});

test('erro de conexão no login mantém formulário e não abre área financeira', async ({ page }) => {
  await page.goto('/'); await expect(button(page, 'Entrar')).toBeVisible();
  await page.route('**/api/auth/login', (route) => route.abort());
  await field(page, 'E-mail').fill('login@example.test'); await field(page, 'Senha').fill(password);
  await button(page, 'Entrar').click();
  await expect(page.getByText('Não foi possível conectar. Verifique sua conexão e tente novamente.', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0); await expect(field(page, 'E-mail')).toHaveValue('login@example.test');
});
