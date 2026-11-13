import { expect, test } from '@playwright/test';
import { existingUser } from './existing-user';

test.beforeEach(async ({ page }) => existingUser(page));

test('etapa 14: telas estreitas, foco após reduzir altura e modal com rolagem', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Editar Perfil', exact: true }).click();
  await page.getByRole('textbox', { name: 'Seu nome', exact: true }).fill('Um nome bastante longo para verificar o layout do aplicativo');
  await page.getByRole('textbox', { name: 'Seu nome', exact: true }).focus();
  await expect(page.getByRole('textbox', { name: 'Seu nome', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await page.getByRole('tab', { name: 'Início', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:8097/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const route of ['/extrato', '/chat', '/metas', '/configuracoes', '/relatorios', '/categorias']) {
    await page.goto(route);
    await expect(page.getByRole('heading').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/metas');
  await page.getByRole('button', { name: 'Nova Meta', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome da meta', exact: true }).fill('Reserva em tela pequena');
  await page.getByRole('textbox', { name: 'Valor desejado (R$)', exact: true }).fill('1000');
  await page.setViewportSize({ width: 320, height: 340 });
  const field = page.getByRole('textbox', { name: 'Já guardado (R$)', exact: true });
  await field.focus(); await field.fill('50'); await expect(field).toBeInViewport();
  await page.getByRole('button', { name: 'Salvar meta', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 480 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Editar meta: Reserva em tela pequena', exact: true })).toBeVisible();
});
