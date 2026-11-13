import { seedBank } from './existing-user';
import { expect, test } from '@playwright/test';
import { createMockData } from '../../src/data/mock-data';
import { registerAccount } from './existing-user';

test('etapa 16: primeira utilização, quatro telas, voltar, nome e conclusão persistida', async ({ page }) => {
  await registerAccount(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Boas-vindas ao Econimizou', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Organize suas receitas e despesas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByText('Etapa 1 de 4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acompanhe seus gastos e metas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Como podemos chamar você?', exact: true }).fill('');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Como podemos chamar você?', exact: true });
  await expect(input).toBeFocused(); await input.fill('Ana');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByText('Olá, Ana 👋', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('Olá, Ana 👋', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Boas-vindas ao Econimizou', exact: true })).toHaveCount(0);
});

test('etapa 16: pular leva ao nome; usuário existente pode rever sem alterar registros', async ({ page }) => {
  await registerAccount(page);
  await page.goto('/'); await page.getByRole('button', { name: 'Pular', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Como podemos chamar você?', exact: true })).toBeVisible();
  const old = createMockData(); delete old.onboarding; old.profile.name = 'Perfil existente';
  await seedBank(page, old);
  await page.evaluate((data) => localStorage.setItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!, JSON.stringify(data)), old);
  await page.goto('/'); await expect(page.getByText('Olá, Perfil existente 👋', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: /^Ver tutorial novamente$/i }).click();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Como podemos chamar você?', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Concluir tutorial', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Ver tutorial novamente$/i })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!));
  expect(saved.profile).toEqual(old.profile); expect(saved.transactions).toEqual(old.transactions); expect(saved.goals).toEqual(old.goals);
  expect(saved.onboarding.completed).toBe(true);
});
