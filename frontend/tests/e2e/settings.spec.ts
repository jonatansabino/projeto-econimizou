import { expect, test } from '@playwright/test';
import { existingUser } from './existing-user';

test.beforeEach(async ({ page }) => existingUser(page));

test('tela de Ajustes reorganizada exibe cabeçalho, seções Minha Conta, Minhas Finanças e Preferências', async ({ page }) => {
  await page.goto('/configuracoes');

  // 1. Cabeçalho do Perfil
  await expect(page.getByText('Jonatan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar Perfil', exact: true })).toBeVisible();

  // 2. Seção Minha Conta
  await expect(page.getByRole('heading', { name: 'Minha Conta', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dados pessoais', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Foto de perfil', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alterar senha', exact: true })).toBeVisible();

  // 3. Seção Minhas Finanças
  await expect(page.getByRole('heading', { name: 'Minhas Finanças', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Minha renda', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Categorias', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Limites de gastos', exact: true })).toBeVisible();

  // 4. Seção Preferências
  await expect(page.getByRole('heading', { name: 'Preferências', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Central de Notificações', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Segurança e Privacidade', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Ocultar valores', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Notificações simuladas', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Animações suaves', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver tutorial novamente', exact: true })).toBeVisible();

  // 5. Botão Sair da Conta
  await expect(page.getByRole('button', { name: 'Sair Da Conta', exact: true })).toBeVisible();
});

test('navegação para Alterar Senha valida formulário, exibe força e aviso de endpoint pendente', async ({ page }) => {
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page).toHaveURL(/.*\/alterar-senha/);

  await expect(page.getByRole('heading', { name: 'Alterar senha', exact: true })).toBeVisible();

  // Tentar salvar vazio
  await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
  await expect(page.getByText('Informe sua senha atual.', { exact: true })).toBeVisible();

  // Preencher senha atual e senha fraca
  await page.getByLabel('Senha atual', { exact: true }).fill('SenhaAtual123!');
  await page.getByLabel('Nova senha', { exact: true }).fill('1234');
  await expect(page.getByText('Força da senha: Fraca')).toBeVisible();

  // Tentar salvar com menos de 8 caracteres
  await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
  await expect(page.getByText('A nova senha deve ter ao menos 8 caracteres.', { exact: true })).toBeVisible();

  // Preencher nova senha forte e confirmação divergente
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenhaForte!2026');
  await expect(page.getByText('Força da senha: Forte')).toBeVisible();
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('OutraSenha123!');
  await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
  await expect(page.getByText('A confirmação deve ser igual à nova senha.', { exact: true })).toBeVisible();

  // Confirmação correta
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenhaForte!2026');
  await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();

  // Exibe aviso claro da API sem salvar em estado local ou gerar sucesso fictício
  await expect(page.getByText(/A alteração de senha ainda depende de disponibilização do endpoint na API/)).toBeVisible();
});

test('navegação para Limites de Gastos exibe status em desenvolvimento e atalho para categorias', async ({ page }) => {
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Limites de gastos', exact: true }).click();
  await expect(page).toHaveURL(/.*\/limites/);

  await expect(page.getByRole('heading', { name: 'Limites de gastos', exact: true })).toBeVisible();
  await expect(page.getByText('Em desenvolvimento', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Gerenciar Categorias', exact: true }).click();
  await expect(page).toHaveURL(/.*\/categorias/);
});

test('modal Minha Renda permite consultar, preencher valor e dia de recebimento', async ({ page }) => {
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Minha renda', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Minha renda', exact: true })).toBeVisible();
  await expect(page.getByText('A renda informada será usada para planejamento e não altera seu saldo. Para registrar dinheiro recebido, utilize o Extrato.')).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar fonte de renda', exact: true }).click();
  await page.getByLabel('Descrição (ex.: Salário, Freelance)', { exact: true }).fill('Salário');
  await page.getByLabel('Valor (R$)', { exact: true }).fill('500000');
  await expect(page.getByLabel('Valor (R$)', { exact: true })).toHaveValue('R$ 5.000,00');
  await page.getByLabel('Dia de recebimento (opcional, 1–31)', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar renda', exact: true }).click();

  // Modal fecha após salvar
  await expect(page.getByRole('heading', { name: 'Minha renda', exact: true })).toHaveCount(0);

  // Subtítulo do item de renda é atualizado com o valor e o dia
  await expect(page.getByText(/R\$\s*5\.000,00 · Dia 10/)).toBeVisible();
});

test('modal de confirmação de logout pode ser cancelado sem encerrar sessão', async ({ page }) => {
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Sair Da Conta', exact: true }).click();

  // Modal de confirmação aberto
  await expect(page.getByRole('heading', { name: 'Sair da Conta', exact: true })).toBeVisible();
  await expect(page.getByText(/Deseja realmente sair\? Sua sessão será encerrada com segurança/)).toBeVisible();

  // Cancelar
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sair da Conta', exact: true })).toHaveCount(0);

  // Permanece autenticado em Ajustes
  await expect(page.getByRole('heading', { name: 'Ajustes', exact: true })).toBeVisible();
});
