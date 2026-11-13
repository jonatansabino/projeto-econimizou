import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMockData } from '../src/data/mock-data.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createAuthApi } from '../src/data/auth-api.ts';
import { mergeCategories } from '../src/domain/categories.ts';

function api() {
  const rows = []; let fail = false; const calls = [];
  return { rows, calls, fail(v) { fail = v; },
    async list() { if (fail) throw Error('offline'); return structuredClone(rows); },
    async create(input, key) { if (fail) throw Error('offline'); calls.push(['create', input, key]); let row = rows.find(r => r.client_key === key || r.name === input.name && r.type === input.type); if (!row) { row = { ...input, id: String(rows.length+1), client_key: key, archived: false }; rows.push(row); } return structuredClone(row); },
    async update(id, input) { if (fail) throw Error('offline'); calls.push(['update', id, input]); const row = rows.find(r => r.id === id); Object.assign(row, input); return structuredClone(row); },
    async remove(id) { if (fail) throw Error('offline'); calls.push(['remove', id]); rows.find(r => r.id === id).archived = true; },
  };
}
async function setup(remote = api(), saved = createMockData()) {
  let raw = JSON.stringify(saved), fail = false;
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key,v) => { if (fail) throw Error('disk'); raw = v; } });
  const store = createFinanceStore(repository, undefined, remote); await store.initialize();
  return { remote, store, repository, data: () => store.getSnapshot().data, raw: () => raw, disk(v) { fail = v; } };
}
test('consulta não envia automaticamente categorias locais e não altera transações', async () => {
  const f = await setup(); const before = structuredClone(f.data()); await f.store.refreshCategories();
  assert.deepEqual(f.data(), before); assert.equal(f.remote.rows.length, 0);
});
test('CRUD passa pela API; nova instância recupera nome atualizado do banco', async () => {
  const f = await setup(); await f.store.saveCategory({ name: 'Categoria pessoal', type: 'expense' });
  const category = f.data().categories.at(-1); assert.ok(category.remoteId);
  await f.store.saveCategory({ name: 'Nome novo', type: 'expense' }, category.id); assert.equal(f.remote.rows[0].name, 'Nome novo');
  await f.store.deleteCategory(category.id); assert.equal(f.remote.rows[0].archived, true); assert.equal(f.data().categories.at(-1).archived, true);
});
test('segundo aparelho consulta as mesmas categorias sem depender do cache anterior', async () => {
  const a = await setup(); await a.store.saveCategory({ name: 'Personalizada', type: 'income' });
  const b = await setup(a.remote); await b.store.refreshCategories(); const category = b.data().categories.find(c=>c.name==='Personalizada'); assert.equal(category.remoteId, a.remote.rows[0].id); assert.match(category.id,/^api-category:/);
});
test('offline não publica gravação local como sucesso de banco; cache continua acessível', async () => {
  const f = await setup(), before = f.raw(); f.remote.fail(true);
  await assert.rejects(f.store.saveCategory({ name: 'Offline', type: 'expense' }), /offline/); assert.equal(f.raw(), before);
  await assert.rejects(f.store.refreshCategories()); assert.equal(f.store.getSnapshot().status,'ready'); assert.match(f.store.getSnapshot().categoryError,/offline/);
});
test('falha de cache após POST não duplica no servidor; atualização recupera a categoria', async () => {
  const f = await setup(); f.disk(true); await assert.rejects(f.store.saveCategory({ name:'Persistida no banco',type:'expense' }),/salvar/); assert.equal(f.remote.rows.length,1);
  f.disk(false); await f.store.refreshCategories(); assert.equal(f.data().categories.filter(c=>c.name==='Persistida no banco').length,1);
});
test('exclusão remota e renomeação preservam históricos; novas transações não usam categoria arquivada', async () => {
  const f = await setup(); for (const category of [...f.data().categories]) await f.store.saveCategory({name:category.name,type:category.type},category.id); const before = structuredClone(f.data().transactions); const c = f.data().categories.find(c=>c.id===before[0].categoryId);
  const remote = f.remote.rows.find(r=>r.id===c.remoteId); remote.name='Nome no outro aparelho'; remote.archived=true; await f.store.refreshCategories();
  assert.equal(f.data().categories.find(x=>x.id===c.id).archived,true); assert.deepEqual(f.data().transactions,before);
  await assert.rejects(f.store.addTransaction({ ...before[0], description:'Nova' }),/excluída/);
});
test('duplicidade e mudança de tipo protegido são recusadas antes da API', async () => {
  const f = await setup(); await f.store.saveCategory({ name:'Fixa',type:'expense' }); const c=f.data().categories.at(-1), count=f.remote.calls.length;
  await assert.rejects(f.store.saveCategory({name:'Fixa',type:'income'},c.id),/fixo/); await assert.rejects(f.store.saveCategory({name:'Fixa',type:'expense'}),/existe/); assert.equal(f.remote.calls.length,count);
});
test('resposta inválida não reescreve categorias locais', () => {
  assert.throws(()=>mergeCategories(createMockData().categories,[{id:'../outro',name:'Inválida',type:'expense',client_key:null,archived:false}]),/inválida/);
});
test('cliente envia somente campos permitidos, Bearer e conta esperada; usa a mesma proteção CSRF na Web', async () => {
  const calls=[]; const dto={id:'1',name:'Teste',type:'expense',client_key:'local',archived:false};
  const transport=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/csrf')?{csrf_token:'token'}:{category:dto}),{status:200,headers:{'Content-Type':'application/json'}})};
  const native=createAuthApi({url:'http://127.0.0.1:8082',allowLocalHttp:true,web:false,transport});native.setToken('secure'); await native.categoriesForUser('7').create({name:'Teste',type:'expense',user_id:'9',id:'local'},'local');
  assert.deepEqual(JSON.parse(calls[0].options.body),{name:'Teste',type:'expense',client_key:'local'});assert.equal(calls[0].options.headers.Authorization,'Bearer secure');assert.equal(calls[0].options.headers['X-Account-ID'],'7');
  const web=createAuthApi({url:'http://127.0.0.1:8082',allowLocalHttp:true,web:true,transport}); await web.categoriesForUser('7').create({name:'Teste',type:'expense'},'local');
  assert.equal(calls[1].url.endsWith('/csrf'),true);assert.equal(calls[2].options.credentials,'include');assert.equal(calls[2].options.headers['X-CSRF-Token'],'token');assert.equal(calls[2].options.headers.Authorization,undefined);
});

test('trocar de conta invalida consultas atrasadas e impede novos envios da sessão anterior', async () => {
  const { createAuthStore } = await import('../src/state/auth-store.ts');
  let resolve; let creates = 0; let current = { id:'a',name:'Ana',email:'a@example.test',avatar:'💰' };
  const categoryApi = { list: () => new Promise(r=>{resolve=r}), create:async()=>{creates++;}, update:async()=>{}, remove:async()=>{} };
  const auth = createAuthStore({ setToken() {}, me:async()=>({user:current}), login:async()=>({user:current,access_token:'token'}), register:async()=>({user:current,access_token:'token'}), logout:async()=>{}, profile:async()=>({user:current}), categoriesForUser:()=>categoryApi },{get:async()=>'token',set:async()=>{},clear:async()=>{}},false);
  await auth.restore(); const old=auth.getCategoryApi('a'); const pending=old.list(); await auth.logout(); current={...current,id:'b'}; await auth.login({email:'b@example.test',password:'x'}); resolve([]);
  await assert.rejects(pending,/sessão mudou/); await assert.rejects(old.create({name:'Não enviar',type:'expense'},'key'),/sessão mudou/); assert.equal(creates,0);
});

test('consulta lenta não bloqueia gravações financeiras nem sobrescreve edição de categoria mais recente', async () => {
  const f=await setup(); await f.store.saveCategory({name:'Original',type:'expense'}); const category=f.data().categories.at(-1);
  const stale=structuredClone(f.remote.rows); let resolve; f.remote.list=()=>new Promise(r=>{resolve=r}); const refreshing=f.store.refreshCategories();
  await f.store.updatePreferences({hideAmounts:true}); await f.store.saveCategory({name:'Atualizada',type:'expense'},category.id);
  resolve(stale); await refreshing; assert.equal(f.data().preferences.hideAmounts,true);assert.equal(f.data().categories.find(c=>c.id===category.id).name,'Atualizada');
});

test('logout com falha mantém a sessão e permite continuar consultando categorias', async () => {
  const { createAuthStore } = await import('../src/state/auth-store.ts'); const user={id:'a',name:'Ana',email:'a@example.test',avatar:'💰'};
  const categories={list:async()=>[],create:async()=>{},update:async()=>{},remove:async()=>{}};
  const auth=createAuthStore({setToken(){},me:async()=>({user}),login:async()=>({user,access_token:'token'}),register:async()=>({user,access_token:'token'}),logout:async()=>{throw Error('offline')},profile:async()=>({user}),categoriesForUser:()=>categories},{get:async()=>'token',set:async()=>{},clear:async()=>{}},false);
  await auth.restore(); const api=auth.getCategoryApi('a'); await assert.rejects(auth.logout(),/offline/); assert.equal(auth.getSnapshot().status,'signedIn');assert.deepEqual(await api.list(),[]);
});

test('sincronização de categorias não apaga um erro de gravação financeira anterior', async () => {
  const f=await setup(); f.disk(true); await assert.rejects(f.store.updatePreferences({hideAmounts:true})); const error=f.store.getSnapshot().error;
  f.disk(false); await f.store.refreshCategories(); assert.equal(f.store.getSnapshot().error,error);assert.equal(f.data().preferences.hideAmounts,false);
});


test('registro ausente na consulta completa fica indisponível sem apagar referências financeiras', async () => {
  const f=await setup(); for (const category of [...f.data().categories]) await f.store.saveCategory({name:category.name,type:category.type},category.id); const before=structuredClone(f.data().transactions), removed=f.data().categories[0];
  f.remote.rows.splice(f.remote.rows.findIndex(r=>r.id===removed.remoteId),1);await f.store.refreshCategories();
  assert.equal(f.data().categories.find(c=>c.id===removed.id).archived,true);assert.deepEqual(f.data().transactions,before);
});
