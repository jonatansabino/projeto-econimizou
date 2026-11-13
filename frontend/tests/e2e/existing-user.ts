import type { Page } from '@playwright/test';
import { createMockData } from '../../src/data/mock-data';
import { accountStorageKey } from '../../src/data/account-finance-repository';

export const TEST_API_URL = process.env.TEST_API_URL ?? 'http://127.0.0.1:8082';
export async function registerAccount(page: Page, name = 'Jonatan') {
  const headers = { Origin: 'http://127.0.0.1:8097', 'X-Auth-Client': 'web' };
  const csrfResponse = await page.request.get(`${TEST_API_URL}/api/auth/csrf`, { headers });
  if (!csrfResponse.ok()) throw new Error('Não foi possível preparar a API de teste.');
  const { csrf_token } = await csrfResponse.json();
  const credentials = { name, email: `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}@example.test`, password: 'RioVerde!7824#', password_confirmation: 'RioVerde!7824#' };
  const response = await page.request.post(`${TEST_API_URL}/api/auth/register`, { headers: { ...headers, 'X-CSRF-Token': csrf_token }, data: credentials });
  if (response.status() !== 201) throw new Error(`Falha de cadastro na API isolada: HTTP ${response.status()}`);
  let { user } = await response.json();
  const completed = await page.request.patch(`${TEST_API_URL}/api/auth/profile`, { headers: { ...headers, 'X-CSRF-Token': csrf_token }, data: { personalization_completed: true } });
  if (!completed.ok()) throw new Error('Falha ao preparar perfil da fixture.');
  user = (await completed.json()).user;
  return { ...credentials, user, key: accountStorageKey(TEST_API_URL, user.id) };
}

// Sessão real da API isolada; mocks financeiros são apenas fixtures locais de regressão.
export async function existingUser(page: Page) {
  const seed = createMockData(); seed.onboarding = { completed: true };
  const account = await registerAccount(page, seed.profile.name);
  const today=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
  seed.transactions.forEach(t=>{t.date=today});
  await seedBank(page,seed);
  await page.addInitScript(({ data, key }) => {
    if (localStorage.getItem(key) !== null) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    data.transactions.forEach((transaction) => { transaction.date = date; });
    localStorage.setItem(key, JSON.stringify(data));
  }, { data: seed, key: account.key });
  return account;
}

// Somente fixtures do banco de TESTE. A aplicação não importa dados locais.
export async function seedBank(page: Page, data: ReturnType<typeof createMockData>) {
  const headers: Record<string,string>={Origin:'http://127.0.0.1:8097','X-Auth-Client':'web'};
  const me=await page.request.get(`${TEST_API_URL}/api/auth/me`,{headers}); const user=(await me.json()).user;
  headers['X-Account-ID']=user.id;
  const csrf=await page.request.get(`${TEST_API_URL}/api/auth/csrf`,{headers});headers['X-CSRF-Token']=(await csrf.json()).csrf_token;
  const read=await page.request.get(`${TEST_API_URL}/api/finance`,{headers}); if(!read.ok())throw Error(`Falha ao ler banco isolado: HTTP ${read.status()}`);let state=await read.json();headers['X-Finance-Reset']=state.resetKey;
  for(const category of data.categories){
    let remote=state.categories.find((c:{id:string;client_key:string})=>c.id===category.remoteId||c.client_key===category.id);
    if(!remote){const response=await page.request.post(`${TEST_API_URL}/api/categories`,{headers,data:{name:category.name,type:category.type,client_key:category.id}});if(!response.ok())throw Error('Falha ao preparar categoria de teste.');remote=(await response.json()).category;}
    category.remoteId=remote.id;category.archived=remote.archived;
  }
  const changes=[...state.transactions.filter((t:{client_key:string})=>!data.transactions.some(x=>x.id===t.client_key)).map((t:{client_key:string})=>({op:'delete',client_key:t.client_key})),...data.transactions.map(t=>({op:'put',client_key:t.id,category_id:data.categories.find(c=>c.id===t.categoryId)!.remoteId,type:t.type,description:t.description,amount_cents:t.amountCents,transaction_date:t.date}))];
  if(changes.length){const response=await page.request.post(`${TEST_API_URL}/api/finance/transactions`,{headers,data:{reset_key:state.resetKey,revision:state.revision,operation_id:`fixture-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,changes}});if(!response.ok())throw Error(`Falha ao preparar lançamentos: ${response.status()}`);state=await response.json();}
  data.financeResetKey=state.resetKey;data.financeRevision=state.revision;return data;
}
