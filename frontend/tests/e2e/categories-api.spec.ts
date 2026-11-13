import { expect, test, type Page } from '@playwright/test';
import { existingUser, TEST_API_URL } from './existing-user';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function cloud(page: Page) { const response = await page.request.get(`${TEST_API_URL}/api/categories`, { headers: { Origin:'http://127.0.0.1:8097','X-Auth-Client':'web' } }); expect(response.ok()).toBe(true); return (await response.json()).categories; }
async function local(page: Page) { return page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('@econimizou/finance:account:'))!)!)); }
async function create(page: Page, name: string) { await button(page,'Nova Categoria').click(); await page.getByLabel('Nome da categoria',{exact:true}).fill(name); await button(page,'Salvar categoria').click(); await expect(button(page,'Salvar categoria')).toHaveCount(0); }

test('CRUD de categorias usa a API real e persiste no MariaDB', async ({page}) => {
  await existingUser(page); await page.goto('/categorias');
  await expect(button(page,'Nova Categoria')).toBeVisible();
  await create(page,'Categoria personalizada'); const row=(await cloud(page)).find((c:{name:string})=>c.name==='Categoria personalizada'); expect(row.id).toBeTruthy();
  await button(page,'Editar categoria: Categoria personalizada').click(); await page.getByLabel('Nome da categoria',{exact:true}).fill('Categoria renomeada'); await button(page,'Salvar categoria').click(); await expect(button(page,'Salvar categoria')).toHaveCount(0);
  expect((await cloud(page)).find((c:{id:string})=>c.id===row.id).name).toBe('Categoria renomeada');
  await page.reload(); await expect(page.getByText('Categoria renomeada',{exact:true})).toBeVisible();
  await button(page,'Excluir categoria: Categoria renomeada').click(); await button(page,'Excluir definitivamente').click(); await expect(button(page,'Editar categoria: Categoria renomeada')).toHaveCount(0);
  expect((await cloud(page)).find((c:{id:string})=>c.id===row.id).archived).toBe(true);
});

test('categorias antigas não têm botão de envio e novos registros já pertencem ao banco',async({page})=>{
  await existingUser(page);await page.goto('/categorias');await expect(button(page,'Enviar categorias locais ao banco')).toHaveCount(0);await expect(page.getByText('Somente neste aparelho',{exact:true})).toHaveCount(0);
  const before=await cloud(page);await create(page,'Criada diretamente');expect((await cloud(page)).length).toBe(before.length+1);
});

test('mesma conta em outro navegador recupera categorias; outra conta não vê os registros', async ({page,browser}) => {
  const account=await existingUser(page); await page.goto('/categorias'); await create(page,'Exclusiva da primeira conta');
  const context=await browser.newContext({baseURL:'http://127.0.0.1:8097'}); const second=await context.newPage();
  try {
    await second.goto('/login'); await second.getByLabel('E-mail',{exact:true}).fill(account.email); await second.getByLabel('Senha',{exact:true}).fill(account.password); await button(second,'Entrar').click();
    await expect(second.getByRole('heading',{name:'Boas-vindas ao Econimizou',exact:true})).toBeVisible(); await button(second,'Pular').click(); await button(second,'Começar').click(); await expect(second.getByText('Olá, Jonatan 👋',{exact:true})).toBeVisible();
    await second.goto('/categorias'); await expect(second.getByText('Exclusiva da primeira conta',{exact:true})).toBeVisible();
    await existingUser(second); await second.goto('/categorias'); await expect(button(second,'Nova Categoria')).toBeVisible(); await expect(second.getByText('Exclusiva da primeira conta',{exact:true})).toHaveCount(0);
    await create(second,'Só da segunda conta'); expect((await cloud(page)).some((c:{name:string})=>c.name==='Só da segunda conta')).toBe(false);
  } finally { await context.close(); }
});

test('indisponibilidade da API não apresenta categoria local como salva no banco', async ({page}) => {
  await existingUser(page); await page.goto('/categorias'); await expect(button(page,'Nova Categoria')).toBeVisible();
  await page.route(`${TEST_API_URL}/api/categories**`, route=>route.abort());
  await button(page,'Nova Categoria').click(); await page.getByLabel('Nome da categoria',{exact:true}).fill('Não salvar offline'); await button(page,'Salvar categoria').click();
  await expect(page.getByRole('alert').filter({hasText:'Não foi possível conectar'}).last()).toBeVisible(); expect((await local(page)).categories.some((c:{name:string})=>c.name==='Não salvar offline')).toBe(false);
});
