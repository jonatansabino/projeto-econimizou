import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMockData} from '../src/data/mock-data.ts';
import {createFinanceRepository} from '../src/data/finance-repository.ts';
import {createFinanceStore} from '../src/state/finance-store.ts';
import {applyBankSnapshot,bankChanges} from '../src/domain/remote-finance.ts';
const key='a'.repeat(32);
const category={id:'1',name:'Pessoal',type:'expense',client_key:'category-one',archived:false};
function bankApi(){
  let state={resetKey:key,revision:0,categories:[category],transactions:[]};let fail=false;const calls=[];
  return {calls,state:()=>structuredClone(state),set:s=>{state=structuredClone(s)},fail:v=>{fail=v},
    async read(){if(fail)throw Error('offline');return structuredClone(state)},
    async apply(body){if(fail)throw Error('offline');assert.equal(body.reset_key,state.resetKey);assert.equal(body.revision,state.revision);calls.push(body);
      for(const c of body.changes){state.transactions=state.transactions.filter(t=>t.client_key!==c.client_key);if(c.op==='put')state.transactions.push({id:'1',...c})}
      state.revision++;return structuredClone(state);
    }
  }
}
async function setup(){let raw=JSON.stringify(createMockData()),disk=false;const api=bankApi();const repository=createFinanceRepository({getItem:async()=>raw,setItem:async(_k,v)=>{if(disk)throw Error('quota');raw=v}});const store=createFinanceStore(repository,undefined,undefined,api);await store.initialize();return {store,api,repository,disk:v=>disk=v,data:()=>store.getSnapshot().data,raw:()=>raw}}
const input=f=>({description:'Compra',type:'expense',amountCents:4500,categoryId:f.data().categories[0].id,date:'2026-11-13'});
test('primeira consulta do banco zera registros anteriores, preservando perfil e preferências',async()=>{
 const f=await setup(),old=createMockData();assert.deepEqual(f.data().profile,old.profile);assert.deepEqual(f.data().preferences,old.preferences);assert.deepEqual(f.data().transactions,[]);assert.deepEqual(f.data().goals,[]);assert.deepEqual(f.data().chatMessages,[]);assert.deepEqual(f.data().commitments,[]);assert.equal(f.data().categories.length,1);assert.equal(f.api.calls.length,0);
});
test('entrada/saída só é publicada após gravação no banco e recarga usa o servidor',async()=>{
 const f=await setup();await f.store.addTransaction(input(f),'tx-manual');assert.equal(f.api.calls.length,1);assert.equal(f.data().transactions[0].amountCents,4500);
 const next=createFinanceStore(f.repository,undefined,undefined,f.api);await next.initialize();assert.equal(next.getSnapshot().data.transactions.length,1);
 await f.store.updateTransaction('tx-manual',{...input(f),amountCents:3900});assert.equal(f.api.state().transactions[0].amount_cents,3900);await f.store.deleteTransaction('tx-manual');assert.equal(f.api.state().transactions.length,0);
});
test('tentativa repetida com a mesma chave não duplica lançamento',async()=>{
 const f=await setup();await f.store.addTransaction(input(f),'same-form');await f.store.addTransaction(input(f),'same-form');assert.equal(f.data().transactions.length,1);assert.equal(f.api.calls.length,1);
});
test('falha de API não gera transação apenas local',async()=>{
 const f=await setup();f.api.fail(true);await assert.rejects(f.store.addTransaction(input(f),'offline'),/offline/);assert.deepEqual(f.data().transactions,[]);
});
test('cache indisponível após confirmação remota mantém o valor real do banco sem duplicar',async()=>{
 const f=await setup();f.disk(true);await f.store.addTransaction(input(f),'bank-saved');assert.equal(f.api.state().transactions.length,1);assert.equal(f.data().transactions.length,1);assert.match(f.store.getSnapshot().error,/Salvo no banco/);
});
test('nova geração do banco descarta caches financeiros e preserva os perfis',async()=>{
 const f=await setup();await f.store.addTransaction(input(f),'old');const profile=f.data().profile;f.api.set({resetKey:'b'.repeat(32),revision:0,categories:[],transactions:[]});await f.store.refreshBank();assert.deepEqual(f.data().transactions,[]);assert.deepEqual(f.data().categories,[]);assert.deepEqual(f.data().profile,profile);assert.equal(f.api.calls.length,1);
});
test('confirmação de conta também grava no banco; desfazer remove a mesma transação',async()=>{
 const f=await setup();await f.store.saveCommitment({type:'payable',description:'Internet',amountCents:9900,categoryId:f.data().categories[0].id,dueDate:'2026-11-13',notes:''});const bill=f.data().commitments[0];await f.store.settleCommitment(bill.id,'2026-11-13',10000);assert.equal(f.api.state().transactions[0].amount_cents,10000);assert.equal(f.data().transactions[0].commitmentId,bill.id);await f.store.undoCommitment(bill.id);assert.deepEqual(f.api.state().transactions,[]);assert.equal(f.data().commitments[0].status,'pending');
});
test('propostas do chat confirmadas gravam no banco',async()=>{
 const f=await setup();await f.store.sendMessage('Gastei R$ 45');const proposal=f.data().chatMessages.find(m=>m.proposal);assert.ok(proposal);await f.store.resolveProposal(proposal.id,true);assert.equal(f.api.state().transactions.length,1);assert.equal(f.data().chatMessages.find(m=>m.id===proposal.id).status,'confirmed');
});
test('snapshot remoto reconcilia efetivo da conta e mantém o vínculo',async()=>{
 const f=await setup();await f.store.saveCommitment({type:'payable',description:'Internet',amountCents:9900,categoryId:f.data().categories[0].id,dueDate:'2026-11-13',notes:''});const bill=f.data().commitments[0];const remote=f.api.state();remote.transactions=[{id:'1',client_key:`commitment-tx:${bill.id}`,category_id:'1',description:'Internet',type:'expense',amount_cents:10000,transaction_date:'2026-11-13'}];remote.revision=1;const data=applyBankSnapshot(f.data(),remote);assert.equal(data.commitments[0].status,'settled');assert.equal(data.transactions[0].commitmentId,bill.id);assert.deepEqual(bankChanges(data,data),[]);
});

test('repetir formulário com valor diferente não sobrescreve um lançamento já gravado',async()=>{
 const f=await setup();await f.store.addTransaction(input(f),'same-form');await assert.rejects(f.store.addTransaction({...input(f),amountCents:6000},'same-form'),/já foi gravado/);assert.equal(f.api.state().transactions[0].amount_cents,4500);
});
