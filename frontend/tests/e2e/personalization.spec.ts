import { expect, test, type Page } from '@playwright/test';
import { TEST_API_URL } from './existing-user';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const field = (page: Page, name: string) => page.getByLabel(name, { exact: true });
async function signup(page: Page) {
  await page.goto('/register');
  await field(page, 'Nome completo').fill('Ana Personalizada');
  await field(page, 'E-mail').fill(`profile-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`);
  await field(page, 'Senha').fill('RioVerde!7824#');
  await field(page, 'Confirmar senha').fill('RioVerde!7824#');
  let requests = 0;
  const count = (request: { url(): string; method(): string }) => { if (request.url().endsWith('/api/auth/register') && request.method() === 'POST') requests++; };
  page.on('request', count);
  await button(page, 'Criar conta').evaluate((element: HTMLElement) => { element.click(); element.click(); });
  await expect(page.getByRole('heading', { name: 'Vamos personalizar seu Economizou?', exact: true })).toBeVisible();
  expect(requests).toBe(1); page.off('request', count);
  await expect(button(page, 'Não informar nascimento')).toHaveCount(0);
  await expect(button(page, 'Prefiro informar depois')).toHaveCount(0);
}
async function finishTutorial(page: Page) {
  await button(page, 'Pular').click(); await button(page, 'Começar').click();
  await expect(page.getByText('Olá, Ana Personalizada 👋', { exact: true })).toBeVisible();
}
async function profile(page: Page) {
  const response = await page.request.get(`${TEST_API_URL}/api/auth/me`, { headers: { Origin: 'http://127.0.0.1:8097', 'X-Auth-Client': 'web' } });
  expect(response.ok()).toBe(true); return (await response.json()).user.personalization;
}

test('cadastro valida senha, personaliza, persiste e permite edição sem alterar finanças', async ({ page }) => {
  await page.goto('/register');
  await button(page, 'Criar conta').click(); await expect(field(page, 'Nome completo')).toBeFocused();
  await field(page, 'Nome completo').fill('Ana'); await field(page, 'E-mail').fill('ana@example.test');
  await field(page, 'Senha').fill('curta'); await field(page, 'Confirmar senha').fill('outra');
  await expect(page.getByText('Força da senha: Fraca', { exact: true })).toBeVisible();
  await button(page, 'Criar conta').click(); await expect(field(page, 'Senha')).toBeFocused();
  await expect(page.getByText('As senhas precisam ser iguais.', { exact: true })).toBeVisible();
  await signup(page);
  await button(page, 'Dia de nascimento').click(); await button(page, 'Dia: 29').click();
  await button(page, 'Mês de nascimento').click(); await button(page, 'Mês: 02').click();
  await button(page, 'Ano de nascimento').click(); await button(page, 'Ano: 2000').click();
  await page.getByRole('radio', { name: 'Juntar dinheiro para uma conquista', exact: true }).click();
  await field(page, 'Renda mensal (opcional)').fill('520000');
  await expect(field(page, 'Renda mensal (opcional)')).toHaveValue('R$ 5.200,00');
  await button(page, 'Continuar').click(); await finishTutorial(page);
  expect(await profile(page)).toEqual({ birth_date: '2000-02-29', financial_objective: 'achievement', monthly_income_cents: 520000, completed: true });
  await page.reload(); await expect(page.getByText('Olá, Ana Personalizada 👋', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Saldo total: R$ 0,00', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Ajustes', exact: true }).click(); await page.getByRole('button', { name: /^Editar perfil$/i }).click();
  await expect(button(page, 'Dia de nascimento')).toContainText('29');
  await expect(button(page, 'Mês de nascimento')).toContainText('02');
  await expect(button(page, 'Ano de nascimento')).toContainText('2000');
  await expect(field(page, 'Renda mensal (opcional)')).toHaveValue('R$ 5.200,00');
  await button(page, 'Dia de nascimento').click(); await button(page, 'Limpar data de nascimento').click(); await field(page, 'Renda mensal (opcional)').click();
  await field(page, 'Renda mensal (opcional)').fill('');
  await expect(field(page, 'Renda mensal (opcional)')).toHaveAttribute('value', '');
  await field(page, 'Renda mensal (opcional)').press('Tab');
  await expect(field(page, 'Renda mensal (opcional)')).toHaveValue('');
  await page.getByRole('radio', { name: 'Sair das dívidas', exact: true }).click();
  await button(page, 'Salvar perfil').click(); await expect(button(page, 'Salvar perfil')).toHaveCount(0);
  expect(await profile(page)).toEqual({ birth_date: null, financial_objective: 'debt_free', monthly_income_cents: null, completed: true });
  await page.getByRole('button', { name: /^Editar perfil$/i }).click(); await expect(field(page, 'Renda mensal (opcional)')).toHaveValue('');
  await expect(button(page, 'Não informar nascimento')).toHaveCount(0);
  await expect(button(page, 'Prefiro informar depois')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Sair das dívidas', exact: true })).toBeChecked();
});

for (const action of ['Continuar', 'Pular Por Enquanto ']) test(`campos opcionais: ${action} permite entrar e não repete personalização`, async ({ page }) => {
  await signup(page); await button(page, action).click(); await finishTutorial(page);
  expect(await profile(page)).toEqual({ birth_date: null, financial_objective: null, monthly_income_cents: null, completed: true });
  await page.reload(); await expect(page.getByText('Olá, Ana Personalizada 👋', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vamos personalizar seu Economizou?', exact: true })).toHaveCount(0);
});

test('erros da API mantêm formulários e pular offline não bloqueia o aplicativo', async ({ page }) => {
  await page.goto('/register');
  await page.route('**/api/auth/register', route => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'Escolha uma senha mais forte.', errors: { password: 'Evite senhas comuns.' } }) }));
  await field(page, 'Nome completo').fill('Ana'); await field(page, 'E-mail').fill('ana@example.test');
  await field(page, 'Senha').fill('SenhaTeste!123'); await field(page, 'Confirmar senha').fill('SenhaTeste!123');
  await button(page, 'Criar conta').click(); await expect(page.getByText('Evite senhas comuns.', { exact: true })).toBeVisible();
  await expect(field(page, 'Senha')).toBeFocused(); await expect(page.getByRole('tab')).toHaveCount(0);
  await page.unroute('**/api/auth/register'); await signup(page);
  await page.route('**/api/auth/profile', route => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'Confira a renda.', errors: { monthly_income_cents: 'Renda inválida na API.' } }) }));
  await button(page, 'Continuar').click(); await expect(page.getByText('Renda inválida na API.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vamos personalizar seu Economizou?', exact: true })).toBeVisible();
  await page.unroute('**/api/auth/profile');
  await page.route('**/api/auth/profile', route => route.abort()); await button(page, 'Pular Por Enquanto ').click();
  await page.unroute('**/api/auth/profile'); await finishTutorial(page);
});


test('nascimento: seletores na mesma linha, dia inválido é limpo e datas futuras não são oferecidas', async ({ page }) => {
  await signup(page);
  const boxes = await Promise.all(['Dia', 'Mês', 'Ano'].map(label => button(page, `${label} de nascimento`).boundingBox()));
  expect(boxes.every(box => box && Math.abs(box.y - boxes[0]!.y) < 1)).toBe(true);
  expect(boxes.every(box => box && Math.abs(box.width - boxes[0]!.width) < 1)).toBe(true);
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThan(boxes[1]!.x);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThan(boxes[2]!.x);
  await button(page, 'Ano de nascimento').click(); await button(page, 'Ano: 2024').click();
  await button(page, 'Mês de nascimento').click(); await button(page, 'Mês: 02').click();
  await button(page, 'Dia de nascimento').click(); await button(page, 'Dia: 29').click();
  await button(page, 'Ano de nascimento').click(); await button(page, 'Ano: 2025').click();
  await expect(button(page, 'Dia de nascimento')).not.toContainText('29');
  await button(page, 'Continuar').click();
  await expect(page.getByText('Informe uma data válida, de 1900 até hoje.', { exact: true })).toBeVisible();
  await button(page, 'Dia de nascimento').click(); await expect(button(page, 'Dia: 29')).toHaveCount(0); await button(page, 'Dia: 28').click();
  await button(page, 'Dia de nascimento').click(); await button(page, 'Limpar data de nascimento').click();
  await expect(button(page, 'Ano de nascimento')).not.toContainText('2025');
  const { year, month, day } = await page.evaluate(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }; });
  await button(page, 'Ano de nascimento').click(); await expect(button(page, `Ano: ${year + 1}`)).toHaveCount(0); await button(page, `Ano: ${year}`).click();
  await button(page, 'Mês de nascimento').click();
  if (month < 12) await expect(button(page, `Mês: ${String(month + 1).padStart(2, '0')}`)).toHaveCount(0);
  await button(page, `Mês: ${String(month).padStart(2, '0')}`).click();
  await button(page, 'Dia de nascimento').click(); await expect(button(page, `Dia: ${String(day + 1).padStart(2, '0')}`)).toHaveCount(0);
  await button(page, `Dia: ${String(day).padStart(2, '0')}`).click();
  await page.screenshot({ path: `test-results/birth-date-${page.viewportSize()!.width}.png` });
});

test('nascimento: lista suspensa ancorada com busca, seleção e fechamento sem alteração', async ({ page }) => {
  await signup(page);
  for (const [label, query, option] of [['Dia', '09', '09'], ['Mês', '06', '06'], ['Ano', '1998', '1998']]) {
    await button(page, `${label} de nascimento`).click();
    await field(page, `Buscar ${label.toLowerCase()} de nascimento`).fill(query);
    await button(page, `${label}: ${option}`).click();
    await expect(button(page, `${label} de nascimento`)).toContainText(option);
  }
  await button(page, 'Dia de nascimento').click();
  const popup = page.getByLabel('Opções de dia de nascimento', { exact: true });
  await expect(popup).toBeVisible();
  const box = await popup.boundingBox();
  const anchor = await button(page, 'Dia de nascimento').boundingBox();
  // O editor reposiciona acima quando a nova prévia do perfil reduz o espaço abaixo.
  const below = box!.y - anchor!.y - anchor!.height;
  const above = anchor!.y - box!.y - box!.height;
  expect((below >= 0 && below < 8) || (above >= 0 && above < 8)).toBe(true);
  expect(Math.abs(box!.x - anchor!.x)).toBeLessThan(2);
  await expect(button(page, 'Dia: 09')).toBeInViewport();
  await page.screenshot({ path: `test-results/birth-dropdown-${page.viewportSize()!.width}.png` });
  await field(page, 'Buscar dia de nascimento').fill('99');
  await expect(page.getByText('Nenhum resultado.', { exact: true })).toBeVisible();
  await field(page, 'Buscar dia de nascimento').fill('1');
  await expect(button(page, 'Dia: 11')).toBeVisible(); await expect(button(page, 'Dia: 09')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(button(page, 'Dia de nascimento')).toContainText('09');
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 440 });
  await button(page, 'Ano de nascimento').click();
  await field(page, 'Buscar ano de nascimento').fill('1998');
  const compact = await page.getByLabel('Opções de ano de nascimento', { exact: true }).boundingBox();
  expect(compact!.y).toBeGreaterThanOrEqual(0); expect(compact!.y + compact!.height).toBeLessThanOrEqual(440);
  await button(page, 'Ano: 1998').click();
  await page.setViewportSize({ width: 1000, height: 900 });
  await button(page, 'Dia de nascimento').click();
  await expect(button(page, 'Dia: 09')).toBeInViewport();
  await page.screenshot({ path: `test-results/birth-dropdown-desktop-${test.info().project.name}.png` });
  await button(page, 'Fechar seletor de nascimento').click({ position: { x: 2, y: 2 } });
  await expect(button(page, 'Dia de nascimento')).toContainText('09');
});

test('foto na personalização fica em rascunho e é persistida antes da conclusão remota', async ({ page }) => {
  await signup(page);
  await expect(page.getByRole('button', { name: /^Escolher avatar / })).toHaveCount(0);
  await button(page, 'Editar imagem do perfil').click();
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Escolher foto da galeria').click();
  await (await chooser).setFiles('assets/images/icon.png');
  await expect(page.getByRole('img', { name: 'Prévia da foto escolhida', exact: true }).locator('img')).toBeVisible();
  await button(page, 'Usar foto').click();
  const localProfile = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('@econimizou/finance:account:'))!)!).profile);
  expect((await localProfile()).photoRef).toBeFalsy();
  let captured: string | undefined;
  await page.route(`${TEST_API_URL}/api/auth/profile`, async route => {
    captured = (await localProfile()).photoRef;
    expect(captured).toMatch(/^photo-/);
    expect(route.request().postData()).not.toMatch(/photoRef|blob:|data:image|base64/);
    await route.continue();
  });
  await button(page, 'Continuar').click(); await finishTutorial(page);
  await expect(page.getByRole('img', { name: 'Avatar de Ana Personalizada', exact: true }).locator('img')).toBeVisible();
  expect((await localProfile()).photoRef).toBe(captured);
  await page.reload(); await expect(page.getByRole('img', { name: 'Avatar de Ana Personalizada', exact: true }).locator('img')).toBeVisible();
});
