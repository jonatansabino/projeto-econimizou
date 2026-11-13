import { expect, test } from '@playwright/test';
import { existingUser } from './existing-user';

test.beforeEach(async ({ page }) => existingUser(page));

test('etapa 15: erros por campo, foco, máscara, calendário, cancelar e salvar uma vez', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Registrar Gasto', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Descrição', exact: true })).toBeFocused();
  await expect(page.getByText('Informe a descrição da Transação.', { exact: true })).toBeVisible();
  await expect(page.getByText('Informe um valor maior que zero, em reais.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Compra com máscara');
  await page.getByRole('textbox', { name: 'Valor (R$)', exact: true }).fill('4500');
  await expect(page.getByRole('textbox', { name: 'Valor (R$)', exact: true })).toHaveValue('R$ 45,00');
  await page.getByRole('button', { name: 'Selecionar data no calendário', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar hoje', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Descrição', exact: true })).toHaveValue('Compra com máscara');
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).dblclick();
  await expect(page.getByRole('heading', { name: 'Transação salva', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Transação: Compra com máscara', exact: true })).toHaveCount(1);
  await page.reload(); await expect(page.getByLabel('Saldo total: R$ 3.305,50', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar Gasto', exact: true }).click();
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Não salvar');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar E Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Transação: Não salvar', exact: true })).toHaveCount(0);
});
