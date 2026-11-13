import { expect, test, type Page } from '@playwright/test';
import { existingUser } from './existing-user';

test.beforeEach(async ({ page }) => existingUser(page));
async function send(page: Page, text: string) {
  const input = page.getByRole('textbox', { name: 'Mensagem para o assistente', exact: true });
  await input.fill(text); await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  await expect(input).toHaveValue('');
}
async function tab(page: Page, name: string, path: string) {
  await page.getByRole('tab', { name, exact: true }).click(); await expect(page).toHaveURL(`http://127.0.0.1:8097${path}`);
}

test('meta de videogame: pede valor, continua após recarga, confirma e aparece em Metas sem mudar saldo', async ({ page }) => {
  await page.goto('/chat');
  await send(page, 'Quero criar uma economia para comprar um videogame');
  await expect(page.getByText(/Qual é o valor total que você quer juntar/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar criação da meta', exact: true })).toHaveCount(0);
  await page.reload(); await send(page, 'R$ 3.000');
  await expect(page.getByRole('button', { name: 'Confirmar criação da meta', exact: true })).toBeVisible();
  await tab(page, 'Metas', '/metas');
  await expect(page.getByRole('button', { name: 'Editar meta: Comprar um videogame', exact: true })).toHaveCount(0);
  await tab(page, 'Chat IA', '/chat');
  await page.getByRole('button', { name: 'Confirmar criação da meta', exact: true }).click();
  await expect(page.getByText('✓ Meta criada', { exact: true })).toBeVisible();
  await tab(page, 'Metas', '/metas');
  await expect(page.getByRole('button', { name: 'Editar meta: Comprar um videogame', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', { name: 'Editar meta: Comprar um videogame', exact: true })).toHaveCount(1);
  await tab(page, 'Início', '/'); await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
});

test('almocei sem valor: pergunta custo, aceita resposta em reais e registra despesa após sim', async ({ page }) => {
  await page.goto('/chat'); await send(page, 'Almocei');
  await expect(page.getByText(/Qual foi o valor gasto em “Almoço”/)).toBeVisible();
  await page.reload(); await send(page, 'Foi 45,00');
  await expect(page.getByText('Despesa · Almoço', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar registro', exact: true })).toBeVisible();
  await send(page, 'sim');
  await expect(page.getByText('✓ Registro confirmado', { exact: true })).toBeVisible();
  await tab(page, 'Início', '/'); await expect(page.getByLabel('Saldo total: R$ 3.305,50', { exact: true })).toBeVisible();
  await tab(page, 'Extrato', '/extrato'); await page.getByRole('textbox', { name: 'Pesquisar transações', exact: true }).fill('almoço');
  await expect(page.getByRole('button', { name: 'Editar Transação: Almoço', exact: true })).toHaveCount(2);
  await page.reload();
  const transactions = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!).transactions);
  expect(transactions.filter((item: { description: string; type: string }) => item.description === 'Almoço' && item.type === 'expense')).toHaveLength(2);
});

test('frases de gasto geram despesa e cancelar metas ou transações não grava dinheiro', async ({ page }) => {
  await page.goto('/chat'); await send(page, 'Quero criar uma meta de R$ 500 para viagem');
  await expect(page.getByRole('button', { name: 'Confirmar criação da meta', exact: true })).toBeVisible();
  await send(page, 'cancelar'); await expect(page.getByText('Criação da meta cancelada', { exact: true })).toBeVisible();
  await send(page, 'Almocei por R$ 45');
  await expect(page.getByText('Despesa · Almoço', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar registro', exact: true }).click();
  await send(page, 'Não gastei R$ 100 no mercado');
  await expect(page.getByRole('button', { name: 'Confirmar registro', exact: true })).toHaveCount(0);
  await tab(page, 'Início', '/'); await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!));
  expect(data.goals).toHaveLength(1); expect(data.transactions).toHaveLength(5);
});
