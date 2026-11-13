import { expect, test, type Page } from '@playwright/test';
import { existingUser, TEST_API_URL } from './existing-user';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
async function local(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('@econimizou/finance:account:'))!)!)); }
function today() { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
async function create(page: Page, description: string, receivable = false, monthly = false) {
  if (receivable) await button(page, 'Tipo de conta: Contas a Receber').click();
  await button(page, receivable ? 'Nova conta a receber' : 'Nova conta a pagar').click();
  await field(page, 'Descrição do compromisso').fill(description); await field(page, 'Valor previsto (R$)').fill('4500');
  await expect(field(page, 'Vencimento (DD/MM/AAAA)')).toHaveValue(today());
  if (monthly) await button(page, 'Repetição: Mensalmente').click();
  await button(page, 'Salvar compromisso').click(); await expect(button(page, 'Salvar compromisso')).toHaveCount(0);
}
async function settle(page: Page, received = false, value = '5000') {
  await button(page, received ? 'Marcar como recebido' : 'Marcar como pago').first().click();
  await field(page, 'Valor efetivo (R$)').fill(value);
  await button(page, 'Confirmar pagamento ou recebimento').evaluate((element: HTMLElement) => { element.click(); element.click(); });
  await expect(button(page, 'Confirmar pagamento ou recebimento')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => { await existingUser(page); });

test('previsão, confirmação, Extrato, Home e Relatórios sem duplicações; recarga mantém os dados', async ({ page }, info) => {
  await page.goto('/'); await button(page, 'Ver todas').click();
  await expect(page.getByRole('heading', { name: 'Contas', exact: true })).toBeVisible();
  const before = await local(page);
  await create(page, 'Internet prevista');
  expect((await local(page)).transactions).toEqual(before.transactions);
  await settle(page);
  const after = await local(page); expect(after.transactions.length).toBe(before.transactions.length + 1);
  expect(after.commitments[0].actualAmountCents).toBe(5000);
  await expect(button(page, 'Marcar como pago')).toHaveCount(0);
  await expect(page.getByText(/Total pago no período:/)).toContainText('50,00');
  await page.goto('/extrato'); await expect(page.getByText('Internet prevista', { exact: true })).toBeVisible();
  await page.goto('/relatorios'); await expect(page.getByRole('heading', { name: 'Seu dinheiro em perspectiva', exact: true })).toBeVisible();
  await page.goto('/'); await expect(page.getByText(/Saldo projetado \(estimativa\):/)).toBeVisible();
  await page.goto('/contas'); await create(page, 'Freelance previsto', true); await settle(page, true, '6000');
  expect((await local(page)).transactions.length).toBe(before.transactions.length + 2);
  await page.reload(); await button(page, 'Tipo de conta: Contas a Receber').click(); await expect(page.getByText('Freelance previsto', { exact: true })).toBeVisible();
  await expect.poll(() => page.getByRole('heading', { name: 'Contas', exact: true }).evaluate(element => { let opacity = 1; for (let node: Element | null = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity); return opacity; })).toBe(1);
  await button(page, 'Gerenciar Freelance previsto').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/contas-${info.project.name}.png`, animations: 'disabled' });
});

test('corrigir confirmado e excluir apenas compromisso preserva lançamento efetivo', async ({ page }) => {
  await page.goto('/contas'); await create(page, 'Conta corrigida'); await settle(page);
  await button(page, 'Gerenciar Conta corrigida').click(); await button(page, 'Corrigir valor ou data efetivos').click();
  await field(page, 'Valor efetivo (R$)').fill('3900'); await button(page, 'Confirmar correção').click(); await expect(button(page, 'Confirmar correção')).toHaveCount(0);
  expect((await local(page)).commitments[0].actualAmountCents).toBe(3900);
  await button(page, 'Gerenciar Conta corrigida').click(); await button(page, 'Editar apenas esta previsão').click();
  await field(page, 'Valor previsto (R$)').fill('7000'); await button(page, 'Salvar compromisso').click(); await expect(button(page, 'Salvar compromisso')).toHaveCount(0);
  const data = await local(page); expect(data.transactions.at(-1).amountCents).toBe(3900);
  await button(page, 'Gerenciar Conta corrigida').click(); await button(page, 'Excluir compromisso').click(); await button(page, 'Excluir só compromisso e manter lançamento').click();
  await expect(button(page, 'Gerenciar Conta corrigida')).toHaveCount(0);
  const saved = await local(page); expect(saved.commitments).toEqual([]); expect(saved.transactions.at(-1).amountCents).toBe(3900); expect(saved.transactions.at(-1).commitmentId).toBeUndefined();
});

test('validação, cancelar rascunho, filtros, atraso automático e ocultar valores', async ({ page }) => {
  await page.goto('/contas'); await button(page, 'Nova conta a pagar').click(); await button(page, 'Salvar compromisso').click();
  await expect(field(page, 'Descrição do compromisso')).toBeFocused();
  await field(page, 'Descrição do compromisso').fill('Rascunho'); await button(page, 'Cancelar').click(); await button(page, 'Descartar E Sair').click();
  expect((await local(page)).commitments).toBeUndefined();
  await create(page, 'Vencida');
  await button(page, 'Gerenciar Vencida').click(); await button(page, 'Editar apenas esta previsão').click(); await field(page, 'Vencimento (DD/MM/AAAA)').fill('01/01/2020'); await button(page, 'Salvar compromisso').click(); await expect(button(page, 'Salvar compromisso')).toHaveCount(0);
  await button(page, 'Todos os períodos').click(); await button(page, 'Situação da conta: Atrasadas').click(); await expect(page.getByText('A pagar · Atrasada', { exact: true })).toBeVisible();
  await field(page, 'Pesquisar compromissos').fill('Não existe'); await expect(page.getByText(/Nenhum compromisso neste filtro/)).toBeVisible(); await field(page, 'Pesquisar compromissos').fill('Vencida');
  await field(page, 'Mês e ano (MM/AAAA)').fill('01/2020'); await button(page, 'Aplicar período').click(); await expect(page.getByText(/Total atrasado:/)).toContainText('45,00');
  await page.goto('/configuracoes'); await page.getByRole('switch', { name: 'Ocultar valores', exact: true }).click();
  await page.goto('/contas'); await button(page, 'Todos os períodos').click(); await expect(page.getByText(/Total pendente:/)).toContainText('••••••');
  await expect(page.getByText(/Vencimento:/)).toContainText('••••••');
});

test('recorrência mensal: exclusão não recria ocorrência; encerramento persiste', async ({ page }) => {
  await page.goto('/contas'); await create(page, 'Assinatura mensal', false, true);
  const count = (await local(page)).commitments.length; expect(count).toBe(12);
  await button(page, 'Gerenciar Assinatura mensal').click(); await button(page, 'Encerrar recorrência').click(); await button(page, 'Confirmar encerramento').click();
  await expect(button(page, 'Confirmar encerramento')).toHaveCount(0);
  await button(page, 'Gerenciar Assinatura mensal').click(); await button(page, 'Excluir compromisso').click(); await button(page, 'Confirmar exclusão do compromisso').click(); await expect(button(page, 'Gerenciar Assinatura mensal')).toHaveCount(0);
  await page.reload(); expect((await local(page)).commitments.length).toBe(count - 1); expect((await local(page)).commitmentRecurrences[0].active).toBe(false);
});

test('falha de persistência na confirmação não publica sucesso ou Transação parcial', async ({ page }) => {
  await page.goto('/contas'); await create(page, 'Gravação bloqueada'); const before = await local(page);
  await page.route(`${TEST_API_URL}/api/finance/transactions`, route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Não foi possível salvar no banco.'})}));
  await button(page, 'Marcar como pago').click(); await button(page, 'Confirmar pagamento ou recebimento').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível salvar' }).last()).toBeVisible();
  expect(await local(page)).toEqual(before); await expect(button(page, 'Confirmar pagamento ou recebimento')).toBeEnabled();
});
