import { expect, test } from '@playwright/test';
import { existingUser, seedBank } from './existing-user';

test.beforeEach(async ({ page }) => existingUser(page));

test('Home permite alterar receita de 5.200 para 6.000 e mantém extrato, relatório e recarga consistentes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editar receitas do mês', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Valor (R$)', exact: true })).toHaveValue('R$ 5.200,00');
  await page.getByRole('textbox', { name: 'Valor (R$)', exact: true }).fill('600000');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByText('R$ 6.000,00', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 4.150,50', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('R$ 6.000,00', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Transação: Salário do mês', exact: true })).toContainText('6.000,00');
  await page.goto('/relatorios'); await expect(page.getByText('Receitas: R$ 6.000,00', { exact: true })).toBeVisible();
  const transactions = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!).transactions);
  expect(transactions).toHaveLength(5);
  expect(transactions.filter((item: { type: string }) => item.type === 'income')).toHaveLength(1);
});

test('com várias receitas escolhe apenas registros do mês e preserva as demais receitas', async ({ page }) => {
  await page.goto('/');
  const changed = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!; const data = JSON.parse(localStorage.getItem(key)!);
    data.transactions.push({ id: 'bonus', description: 'Bônus mensal', amountCents: 100000, categoryId: 'extra', type: 'income', date: data.transactions[0].date });
    data.transactions.push({ id: 'old-income', description: 'Receita antiga', amountCents: 50000, categoryId: 'extra', type: 'income', date: '2000-01-01' });
    return data;
  });
  await seedBank(page, changed);
  await page.reload();
  await page.getByRole('button', { name: 'Editar receitas do mês', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar receita: Salário do mês', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar receita: Receita antiga', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar receita: Bônus mensal', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Valor (R$)', exact: true })).toHaveValue('R$ 1.000,00');
  await page.getByRole('textbox', { name: 'Valor (R$)', exact: true }).fill('150000');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByText('R$ 6.700,00', { exact: true })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!));
  expect(data.transactions).toHaveLength(7);
  expect(data.transactions.find((item: { id: string }) => item.id === 'mock-salary').amountCents).toBe(520000);
  expect(data.transactions.find((item: { id: string }) => item.id === 'old-income').amountCents).toBe(50000);
});

test('sem receitas no mês o botão abre cadastro de receita', async ({ page }) => {
  await page.goto('/');
  const changed = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!; const data = JSON.parse(localStorage.getItem(key)!);
    data.transactions = data.transactions.filter((item: { type: string }) => item.type !== 'income');
    return data;
  });
  await seedBank(page, changed);
  await page.reload();
  await page.getByRole('button', { name: 'Adicionar receita do mês', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Categoria Da Transação: Salário', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Categoria Da Transação: Alimentação', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Receita cadastrada pela Home');
  await page.getByRole('textbox', { name: 'Valor (R$)', exact: true }).fill('300000');
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByText('R$ 3.000,00', { exact: true })).toBeVisible();
  const income = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!).transactions.filter((item: { type: string }) => item.type === 'income'));
  expect(income).toHaveLength(1); expect(income[0].amountCents).toBe(300000);
});
