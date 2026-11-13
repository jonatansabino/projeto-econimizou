import {expect,test,type Page} from '@playwright/test';
import {existingUser,registerAccount,TEST_API_URL} from './existing-user';
const button=(page:Page,name:string|RegExp)=>page.getByRole('button',{name,exact:typeof name==='string'});
async function bank(page:Page){const r=await page.request.get(`${TEST_API_URL}/api/finance`,{headers:{Origin:'http://127.0.0.1:8097','X-Auth-Client':'web'}});expect(r.ok()).toBe(true);return r.json()}
async function welcome(page:Page){await expect(page.getByRole('heading',{name:'Boas-vindas ao Econimizou',exact:true})).toBeVisible();await button(page,'Pular').click();await button(page,'Começar').click();await expect(page.getByRole('heading',{name:'Seu dinheiro, mais leve.',exact:true})).toBeVisible()}
async function category(page:Page,name:string,income=false){await page.goto('/categorias');await button(page,'Nova Categoria').click();await page.getByLabel('Nome da categoria',{exact:true}).fill(name);if(income)await button(page,/^Tipo da categoria: Receita$/i).click();await button(page,'Salvar categoria').click();await expect(button(page,'Salvar categoria')).toHaveCount(0)}
async function record(page:Page,income:boolean,description:string,value:string){await page.goto(`/transacao?type=${income?'income':'expense'}`);await page.getByLabel('Descrição',{exact:true}).fill(description);await page.getByLabel('Valor (R$)',{exact:true}).fill(value);await button(page,/^Salvar transação$/i).click();await button(page,'Concluir').click()}
test('conta nova começa vazia e grava receitas/despesas no banco, visíveis em outro navegador',async({page,browser})=>{
 const account=await registerAccount(page);await page.goto('/');await welcome(page);expect((await bank(page)).categories).toEqual([]);expect((await bank(page)).transactions).toEqual([]);
 await category(page,'Renda pessoal',true);await category(page,'Gastos pessoais');await record(page,true,'Entrada no banco','520000');await record(page,false,'Saída no banco','35000');
 expect((await bank(page)).transactions).toHaveLength(2);await page.goto('/');await expect(page.getByLabel('Saldo total: R$ 4.850,00',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Saldo total: R$ 4.850,00',{exact:true})).toBeVisible();
 const context=await browser.newContext({baseURL:'http://127.0.0.1:8097'});const other=await context.newPage();try{await other.goto('/login');await other.getByLabel('E-mail',{exact:true}).fill(account.email);await other.getByLabel('Senha',{exact:true}).fill(account.password);await button(other,'Entrar').click();await welcome(other);await expect(other.getByLabel('Saldo total: R$ 4.850,00',{exact:true})).toBeVisible();await other.goto('/extrato');await expect(other.getByText('Entrada no banco',{exact:true})).toBeVisible();await expect(other.getByText('Saída no banco',{exact:true})).toBeVisible();}finally{await context.close()}
});
test('falha de API não cria entrada apenas local; repetir o mesmo formulário não duplica',async({page})=>{
 await existingUser(page);await page.goto('/');const before=(await bank(page)).transactions.length;await page.goto('/transacao?type=expense');await page.getByLabel('Descrição',{exact:true}).fill('Tentativa única');await page.getByLabel('Valor (R$)',{exact:true}).fill('4500');
 await page.route(`${TEST_API_URL}/api/finance/transactions`,route=>route.abort());await button(page,/^Salvar transação$/i).click();await expect(page.getByRole('alert').filter({hasText:'Não foi possível conectar'}).last()).toBeVisible();expect((await bank(page)).transactions).toHaveLength(before);
 await page.unroute(`${TEST_API_URL}/api/finance/transactions`);await button(page,/^Salvar transação$/i).click();await button(page,'Concluir').click();expect((await bank(page)).transactions.filter((t:{description:string})=>t.description==='Tentativa única')).toHaveLength(1);
});

test('consultas financeiras simultâneas não alteram o saldo nem falham por bloqueio',async({page})=>{
 await existingUser(page);await page.goto('/');const snapshots=await Promise.all(Array.from({length:10},()=>bank(page)));expect(snapshots.every(s=>s.revision===snapshots[0].revision)).toBe(true);expect(snapshots.every(s=>s.transactions.length===5)).toBe(true);
});
