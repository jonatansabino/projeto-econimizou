import { existingUser } from './existing-user';
import { expect, test, type Page } from '@playwright/test';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
async function home(page: Page) {
  await page.goto('/');
  await expect(page.getByText(/^Olá, .+ 👋$/)).toBeVisible();
}
async function tab(page: Page, name: string) {
  const route: Record<string, string> = { 'Início': '/', 'Extrato': '/extrato', 'Chat IA': '/chat', 'Metas': '/metas', 'Ajustes': '/configuracoes' };
  await page.getByRole('tab', { name, exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:8097${route[name]}`);
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
}

test.beforeEach(async ({ page }) => existingUser(page));

test('Home, sino, atalhos, navegação e layout responsivo', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await home(page);
  await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  await button(page, 'Notificações não lidas').click();
  await expect(page.getByText('Boas-vindas ao Econimizou!', { exact: true })).toBeVisible();
  await button(page, 'Marcar todas como lidas').click();
  await button(page, 'Voltar').click();
  await expect(button(page, 'Notificações')).toBeVisible();
  await button(page, 'Relatórios').click();
  await expect(page.getByRole('heading', { name: 'Seu dinheiro em perspectiva' })).toBeVisible();
  await button(page, 'Período do relatório: Mês anterior').click();
  await expect(page.getByText('Ainda não há despesas neste período para analisar.')).toBeVisible();
  await button(page, 'Voltar').click();
  await button(page, 'Meta de Economia').click();
  await expect(page.getByRole('heading', { name: 'Cada sonho, um plano.' })).toBeVisible();
  await tab(page, 'Início');
  await button(page, 'Categoria: Alimentação').click();
  await expect(button(page, 'Editar transação: Almoço')).toBeVisible();
  await expect(button(page, 'Editar transação: Salário do mês')).toHaveCount(0);
  await button(page, 'Categoria: Todas').click();
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(button(page, 'Registrar Gasto')).toBeVisible();
  expect(errors).toEqual([]);
});

test('transações: validação, cadastro, filtros, edição, exclusão e persistência após reabrir', async ({ page, context }) => {
  await home(page);
  await button(page, 'Registrar Gasto').click();
  await field(page, 'Descrição').fill('Curso de teste');
  await field(page, 'Valor (R$)').fill('12,50');
  await field(page, 'Data (DD/MM/AAAA)').fill('31/02/2026');
  await button(page, 'Salvar transação').click();
  await expect(page.getByRole('alert')).toContainText('data válida');
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  await field(page, 'Data (DD/MM/AAAA)').fill(date);
  await button(page, 'Salvar transação').click(); await button(page, 'Concluir').click();
  await expect(button(page, 'Editar transação: Curso de teste')).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 3.338,00', { exact: true })).toBeVisible();
  await tab(page, 'Extrato');
  await field(page, 'Pesquisar transações').fill('curso');
  await expect(button(page, 'Editar transação: Curso de teste')).toBeVisible();
  await button(page, 'Tipo: Receitas').click();
  await expect(page.getByText('Nenhuma transação encontrada. Registre um movimento ou ajuste os filtros.')).toBeVisible();
  await button(page, 'Limpar filtros').click();
  await button(page, 'Período: Personalizado').click();
  await field(page, 'Data inicial').fill(date); await field(page, 'Data final').fill(date);
  await button(page, 'Aplicar período').click();
  await field(page, 'Pesquisar transações').fill('curso');
  await button(page, 'Editar transação: Curso de teste').click();
  await field(page, 'Descrição').fill('Curso editado');
  await field(page, 'Valor (R$)').fill('20,00');
  await button(page, 'Salvar alterações').click(); await button(page, 'Concluir').click();
  await expect(button(page, 'Editar transação: Curso editado')).toBeVisible();
  await page.reload();
  await field(page, 'Pesquisar transações').fill('curso');
  await expect(button(page, 'Editar transação: Curso editado')).toBeVisible();
  const reopened = await context.newPage(); await reopened.goto('/');
  await expect(reopened.getByLabel('Saldo total: R$ 3.330,50', { exact: true })).toBeVisible(); await reopened.close();
  await button(page, 'Editar transação: Curso editado').click();
  await button(page, 'Excluir transação').click(); await button(page, 'Cancelar exclusão').click();
  await expect(field(page, 'Descrição')).toHaveValue('Curso editado');
  await button(page, 'Excluir transação').click(); await button(page, 'Excluir definitivamente').click();
  await expect(page.getByText('Nenhuma transação encontrada. Registre um movimento ou ajuste os filtros.')).toBeVisible();
  await tab(page, 'Início');
  await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
});

test('chat: confirmação obrigatória, cancelamento e atualização de Home e Extrato', async ({ page }) => {
  await home(page); await tab(page, 'Chat IA');
  await field(page, 'Mensagem para o assistente').fill('Gastei R$ 45 no almoço'); await button(page, 'Enviar mensagem').click();
  await expect(button(page, 'Confirmar registro')).toBeVisible();
  await tab(page, 'Início');
  await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  await tab(page, 'Chat IA'); await page.reload(); await button(page, 'Confirmar registro').click();
  await expect(page.getByText('✓ Registro confirmado')).toBeVisible();
  await expect(button(page, 'Confirmar registro')).toHaveCount(0);
  await tab(page, 'Início');
  await expect(page.getByLabel('Saldo total: R$ 3.305,50', { exact: true })).toBeVisible();
  await tab(page, 'Extrato'); await field(page, 'Pesquisar transações').fill('almoço');
  await expect(button(page, 'Editar transação: almoço')).toBeVisible();
  await tab(page, 'Chat IA');
  await field(page, 'Mensagem para o assistente').fill('Recebi R$ 100 de teste'); await button(page, 'Enviar mensagem').click();
  await button(page, 'Cancelar registro').click(); await expect(page.getByText('Registro cancelado')).toBeVisible();
  await page.reload(); await expect(page.getByText('Registro cancelado')).toBeVisible();
  await tab(page, 'Início'); await expect(page.getByLabel('Saldo total: R$ 3.305,50', { exact: true })).toBeVisible();
});

test('metas: criar, editar, progresso, aceitar/ignorar sugestões e restaurar após recarga', async ({ page }) => {
  await home(page); await tab(page, 'Metas'); await button(page, 'Nova meta').click();
  await field(page, 'Nome da meta').fill('Viagem de teste'); await field(page, 'Valor desejado (R$)').fill('1000,00'); await field(page, 'Já guardado (R$)').fill('250,00');
  await button(page, 'Salvar meta').click();
  await expect(page.getByRole('progressbar', { name: 'Progresso de Viagem de teste' })).toHaveAttribute('aria-valuenow', '25');
  await button(page, 'Editar meta: Viagem de teste').click(); await field(page, 'Já guardado (R$)').fill('500,00'); await button(page, 'Salvar meta').click();
  await expect(page.getByRole('progressbar', { name: 'Progresso de Viagem de teste' })).toHaveAttribute('aria-valuenow', '50');
  await button(page, 'Aceitar: Planeje as refeições da semana').click(); await button(page, 'Ignorar: Defina uma reserva mensal').click();
  await button(page, 'Ver sugestões avaliadas').click(); await expect(page.getByText('✓ No seu plano')).toBeVisible(); await expect(page.getByText('Sugestão ignorada', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('progressbar', { name: 'Progresso de Viagem de teste' })).toHaveAttribute('aria-valuenow', '50');
  await button(page, 'Excluir meta: Viagem de teste').click(); await button(page, 'Excluir definitivamente').click();
  await expect(button(page, 'Editar meta: Viagem de teste')).toHaveCount(0);
});

test('configurações: perfil, categorias, preferências, central e privacidade', async ({ page }) => {
  await home(page); await tab(page, 'Ajustes'); await button(page, 'Editar perfil').click();
  await field(page, 'Seu nome').fill('João'); await button(page, 'Escolher avatar Brisa').click(); await button(page, 'Salvar perfil').click();
  await button(page, 'Gerenciar categorias').click(); await button(page, 'Nova categoria').click(); await field(page, 'Nome da categoria').fill('Educação'); await button(page, 'Salvar categoria').click();
  await button(page, 'Editar categoria: Educação').click(); await field(page, 'Nome da categoria').fill('Cursos'); await button(page, 'Salvar categoria').click();
  await button(page, 'Excluir categoria: Cursos').click(); await button(page, 'Excluir definitivamente').click(); await expect(button(page, 'Editar categoria: Cursos')).toHaveCount(0);
  await button(page, 'Excluir categoria: Alimentação').click(); await button(page, 'Excluir definitivamente').click(); await expect(page.getByRole('alert')).toContainText('em uso'); await button(page, 'Cancelar exclusão').click();
  await button(page, 'Voltar').click();
  await page.getByRole('switch', { name: 'Ocultar valores', exact: true }).click();
  await page.getByRole('switch', { name: 'Animações suaves', exact: true }).click();
  await page.getByRole('switch', { name: 'Notificações simuladas', exact: true }).click();
  await button(page, 'Segurança e privacidade').click(); await expect(page.getByText('Sem autenticação real', { exact: true })).toBeVisible(); await button(page, 'Voltar').click();
  await tab(page, 'Início'); await expect(page.getByText('Olá, João 👋')).toBeVisible(); await expect(button(page, 'Mostrar valores')).toBeVisible();
  await page.reload(); await expect(page.getByText('Olá, João 👋')).toBeVisible(); await expect(button(page, 'Mostrar valores')).toBeVisible();
  await button(page, 'Mostrar valores').click(); await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  await page.goto('/caminho-inexistente'); await expect(page.getByText('Página não encontrada', { exact: true })).toBeVisible(); await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await expect(page.getByText('Olá, João 👋')).toBeVisible();
});


test('receita: tipo, categoria, atualização do saldo e relatório', async ({ page }) => {
  await home(page); await tab(page, 'Extrato'); await button(page, 'Nova transação').click();
  await button(page, 'Tipo da transação: Receita').click();
  await field(page, 'Descrição').fill('Bônus de teste'); await field(page, 'Valor (R$)').fill('200,00');
  await button(page, 'Categoria da transação: Renda extra').click(); await button(page, 'Salvar transação').click(); await button(page, 'Concluir').click();
  await button(page, 'Tipo: Receitas').click(); await button(page, 'Categoria: Renda extra').click();
  await expect(button(page, 'Editar transação: Bônus de teste')).toBeVisible();
  await expect(button(page, 'Editar transação: Salário do mês')).toHaveCount(0);
  await tab(page, 'Início'); await expect(page.getByLabel('Saldo total: R$ 3.550,50', { exact: true })).toBeVisible();
  await button(page, 'Relatórios').click(); await expect(page.getByText('Receitas: R$ 5.400,00', { exact: true })).toBeVisible();
});

test('falha de hidratação preserva dados e permite nova tentativa', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('@econimizou/finance', '{broken-json'));
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('Os dados salvos foram preservados');
  await button(page, 'Tentar novamente').click(); await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('@econimizou/finance'))).toBe('{broken-json');
  await page.evaluate(() => localStorage.removeItem('@econimizou/finance'));
  await button(page, 'Tentar novamente').click(); await expect(page.getByRole('heading', { name: 'Boas-vindas ao Econimizou', exact: true })).toBeVisible();
});


test('virada de mês atualiza totais e filtros sem alterar saldo histórico', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-30T23:59:30-03:00') });
  await home(page); await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  await page.clock.fastForward(60000);
  await expect(page.getByText('R$ 0,00', { exact: true })).toHaveCount(2);
  await expect(page.getByLabel('Saldo total: R$ 3.350,50', { exact: true })).toBeVisible();
  await tab(page, 'Extrato');
  await expect(page.getByText('Nenhuma transação encontrada. Registre um movimento ou ajuste os filtros.')).toBeVisible();
});
