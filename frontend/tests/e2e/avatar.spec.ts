import { expect, test } from '@playwright/test';
import { existingUser, TEST_API_URL } from './existing-user';

test.beforeEach(async ({ page }) => existingUser(page));

test('avatar DiceBear selecionado atualiza prévia, Ajustes, Home e persiste sem API externa', async ({ page }, testInfo) => {
  const remoteRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:8097/') && !request.url().startsWith(TEST_API_URL + '/')) remoteRequests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()) && /ariaHidden|non-boolean attribute|Invalid hook call|order of Hooks|Rendered (?:more|fewer) hooks/i.test(message.text())) errors.push(message.text());
  });
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Seu nome', exact: true }).fill('Teste Avatar');
  await page.getByRole('button', { name: 'Escolher avatar Brisa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Escolher avatar Brisa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Selecionado: Brisa', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toBeInViewport();
  await expect(page.getByRole('img', { name: 'Prévia do avatar Brisa', exact: true }).locator('svg')).toBeVisible();
  const preview = page.getByRole('img', { name: 'Prévia do avatar Brisa', exact: true }).locator('svg');
  await expect(preview).toHaveAttribute('aria-hidden', 'true');
  await expect(preview).not.toHaveAttribute('ariahidden');
  await expect(preview).not.toHaveAttribute('accessible');
  await page.screenshot({ path: `test-results/avatar-picker-${testInfo.project.name}.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  const settingsAvatar = page.getByRole('img', { name: 'Avatar de Teste Avatar', exact: true });
  await expect(settingsAvatar.locator('svg')).toBeVisible();
  const signature = await settingsAvatar.locator('path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  await page.getByRole('tab', { name: 'Início', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Avatar de Teste Avatar', exact: true }).locator('svg')).toBeVisible();
  expect(await page.getByRole('img', { name: 'Avatar de Teste Avatar', exact: true }).locator('path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')))).toEqual(signature);
  await page.reload();
  await expect(page.getByRole('img', { name: 'Avatar de Teste Avatar', exact: true }).locator('svg')).toBeVisible();
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!).profile);
  expect(profile.avatar).toBe('dicebear:adventurer:2');
  await page.getByRole('tab', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Escolher avatar Brisa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(remoteRequests).toEqual([]); expect(errors).toEqual([]);
});

test('perfil legado é preservado e fechar seleção sem salvar mantém o avatar anterior', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { const key = Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!; const data = JSON.parse(localStorage.getItem(key)!); data.profile.avatar = '💰'; localStorage.setItem(key, JSON.stringify(data)); });
  await page.goto('/configuracoes');
  await expect(page.getByRole('img').first().locator('svg')).toBeVisible();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher avatar Vale', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar Editar perfil', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!).profile.avatar)).toBe('💰');
  await page.reload(); await expect(page.getByRole('img').first().locator('svg')).toBeVisible();
});
