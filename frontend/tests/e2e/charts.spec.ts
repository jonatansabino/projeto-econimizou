import { expect, test } from '@playwright/test';
import { existingUser, seedBank } from './existing-user';
import { createMockData } from '../../src/data/mock-data';

test.beforeEach(async ({ page }) => existingUser(page));

test('etapa 17: três gráficos, seleção de detalhes, filtros, ocultação e recarga', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/relatorios');
  await expect(page.getByTestId('chart-categories').locator('svg')).toBeVisible();
  await expect(page.getByTestId('chart-comparison')).toBeVisible();
  const pie = page.getByTestId('chart-categories');
  const bounds = await pie.boundingBox();
  if (!bounds) throw new Error('Gráfico de categorias não renderizado.');
  await pie.click({ position: { x: bounds.width / 2, y: bounds.height * 0.92 } });
  await expect(page.getByTestId('category-detail')).toBeVisible();
  await page.getByTestId('chart-comparison').click({ position: { x: 40, y: 90 } });
  await expect(page.getByTestId('comparison-detail')).toBeVisible();
  await page.getByTestId('chart-balance').locator('circle').first().click();
  await expect(page.getByTestId('balance-detail')).toBeVisible();
  await page.getByRole('button', { name: 'Detalhar categoria: Alimentação', exact: true }).click();
  await expect(page.getByTestId('category-detail')).toContainText('331,50');
  const month = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  await page.getByRole('button', { name: `Detalhar receitas: ${month}`, exact: true }).click();
  await expect(page.getByTestId('comparison-detail')).toContainText('5.200,00');
  await page.getByRole('button', { name: `Detalhar saldo: ${month}`, exact: true }).click();
  await expect(page.getByTestId('balance-detail')).toContainText('3.350,50');
  await page.getByTestId('chart-balance').screenshot({ path: `test-results/balance-${testInfo.project.name}.png` });
  await page.getByTestId('chart-categories').screenshot({ path: `test-results/categories-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Período do relatório: Escolher ano', exact: true }).click();
  await expect(page.getByRole('button', { name: `Ano do relatório: ${new Date().getFullYear()}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Período do relatório: Escolher mês', exact: true }).click();
  await page.getByRole('button', { name: `Mês do relatório: ${month}`, exact: true }).click();
  await page.goto('/configuracoes'); await page.getByRole('switch', { name: 'Ocultar valores', exact: true }).click();
  await page.goto('/relatorios');
  await expect(page.getByText('Receitas: ••••••', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Detalhar categoria: Alimentação', exact: true }).click();
  await expect(page.getByTestId('category-detail')).toContainText('••••••');
  await expect(page.getByTestId('category-detail')).not.toContainText('331,50');
  await page.reload(); await expect(page.getByText('Receitas: ••••••', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('etapa 17: histórico entre anos, saldo negativo e estados vazios', async ({ page }) => {
  const seed = createMockData(); seed.onboarding = { completed: true };
  seed.transactions = [
    { id: 'old', description: 'Receita anterior', amountCents: 10000, type: 'income', categoryId: 'salary', date: '2025-12-20' },
    { id: 'new', description: 'Despesa maior', amountCents: 20000, type: 'expense', categoryId: 'food', date: '2026-01-15' },
  ];
  await page.goto('/'); await seedBank(page,seed); await page.evaluate((data) => localStorage.setItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!, JSON.stringify(data)), seed);
  await page.goto('/relatorios');
  await page.getByRole('button', { name: 'Período do relatório: Escolher mês', exact: true }).click();
  await page.getByRole('button', { name: 'Mês do relatório: 01/2026', exact: true }).click();
  await page.getByRole('button', { name: 'Detalhar saldo: 01/2026', exact: true }).click();
  await expect(page.getByTestId('balance-detail')).toContainText(/-R\$\s*100,00/);
  await page.getByRole('button', { name: 'Período do relatório: Escolher ano', exact: true }).click();
  await page.getByRole('button', { name: 'Ano do relatório: 2025', exact: true }).click();
  await expect(page.getByText('Receitas: R$ 100,00', { exact: true })).toBeVisible();
  const empty = await page.evaluate(() => { const data = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith('@econimizou/finance:account:'))!)!); data.transactions = []; return data; });
  await seedBank(page,empty);
  await page.reload();
  await expect(page.getByText('Sem transações no período. Altere o filtro ou registre uma receita ou despesa para visualizar os gráficos.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('chart-categories')).toHaveCount(0);
});
