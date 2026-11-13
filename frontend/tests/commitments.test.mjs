import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAccountFinanceRepository } from '../src/data/account-finance-repository.ts';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { financialReport } from '../src/domain/analytics.ts';
import { commitmentStatus, commitmentSummary, monthlyDueDate, projectedBalance, shiftMonth } from '../src/domain/commitments.ts';
import { localDate, summarize, validateFinanceData } from '../src/domain/finance.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

async function fixture() {
  const initial = createMockData(); let raw = JSON.stringify(initial); let fail = false; let writes = 0;
  const storage = { getItem: async () => raw, setItem: async (_key, value) => { if (fail) throw Error('disk'); writes++; raw = value; } };
  const repo = createFinanceRepository(storage); const store = createFinanceStore(repo); await store.initialize();
  return { store, repo, initial, data: () => store.getSnapshot().data, raw: () => raw, fail: value => { fail = value; }, writes: () => writes };
}
function input(data, type = 'payable', extra = {}) {
  return { type, description: type === 'payable' ? 'Conta de teste' : 'Recebimento de teste', categoryId: data.categories.find(c => c.type === (type === 'payable' ? 'expense' : 'income')).id, amountCents: 4500, dueDate: localDate(), notes: '', ...extra };
}
async function add(f, type = 'payable', extra = {}, monthly = false) { await f.store.saveCommitment(input(f.data(), type, extra), undefined, monthly); return f.data().commitments.at(-1); }

test('contas a pagar e receber são previsões; não alteram saldo, renda ou relatórios', async () => {
  const f = await fixture(), before = summarize(f.data().transactions, localDate().slice(0,7));
  await add(f); await add(f, 'receivable');
  assert.equal(f.data().commitments.length, 2); assert.deepEqual(summarize(f.data().transactions, localDate().slice(0,7)), before);
  assert.deepEqual(f.data().transactions, f.initial.transactions); assert.deepEqual(f.data().preferences, f.initial.preferences);
});
test('validação rejeita compromissos incompletos e categorias incompatíveis sem gravar', async () => {
  const f = await fixture(), before = f.raw();
  for (const extra of [{ description: '' }, { amountCents: 0 }, { amountCents: 1.5 }, { dueDate: '2026-02-30' }, { categoryId: 'inexistente' }]) await assert.rejects(f.store.saveCommitment(input(f.data(), 'payable', extra)));
  assert.equal(f.raw(), before);
});
test('edita e exclui previsão sem movimentação financeira', async () => {
  const f = await fixture(); const b = await add(f);
  await f.store.saveCommitment(input(f.data(), 'payable', { description: 'Internet', amountCents: 9900 }), b.id);
  assert.equal(f.data().commitments[0].description, 'Internet'); await f.store.deleteCommitment(b.id); assert.deepEqual(f.data().commitments, []); assert.deepEqual(f.data().transactions, f.initial.transactions);
});
for (const type of ['payable', 'receivable']) test(`confirma ${type} atomicamente; valor efetivo atualiza saldo e relatório`, async () => {
  const f = await fixture(), b = await add(f, type); const before = summarize(f.data().transactions, localDate().slice(0,7)); const writes = f.writes();
  const priorReport = financialReport(f.data().transactions, f.data().categories, { start: localDate(), end: localDate() });
  await f.store.settleCommitment(b.id, localDate(), 5000);
  assert.equal(f.writes() - writes, 1); const bill = f.data().commitments[0]; const tx = f.data().transactions.find(t => t.id === bill.transactionId);
  assert.equal(tx.amountCents, 5000); assert.equal(tx.commitmentId, bill.id); assert.equal(bill.status, 'settled');
  assert.equal(summarize(f.data().transactions, localDate().slice(0,7)).balanceCents, before.balanceCents + (type === 'payable' ? -5000 : 5000));
  const reloaded = createFinanceStore(f.repo); await reloaded.initialize(); assert.deepEqual(reloaded.getSnapshot().data, f.data());
  const report = financialReport(f.data().transactions, f.data().categories, { start: localDate(), end: localDate() });
  assert.equal(type === 'payable' ? report.expenseCents : report.incomeCents, (type === 'payable' ? priorReport.expenseCents : priorReport.incomeCents) + 5000);
});
test('confirmações concorrentes e repetidas não duplicam transações', async () => {
  const f = await fixture(), b = await add(f); const results = await Promise.allSettled([f.store.settleCommitment(b.id, localDate(), 4500), f.store.settleCommitment(b.id, localDate(), 4500)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(f.data().transactions.filter(t => t.commitmentId === b.id).length, 1);
});
test('falha de gravação preserva conta e Transação sem sucesso parcial; permite repetir', async () => {
  const f = await fixture(), b = await add(f); const before = f.raw(); f.fail(true);
  await assert.rejects(f.store.settleCommitment(b.id, localDate(), 4500), /salvar/); assert.equal(f.raw(), before); assert.equal(f.data().commitments[0].status, 'pending'); f.fail(false); await f.store.settleCommitment(b.id, localDate(), 4500); assert.equal(f.data().commitments[0].status, 'settled');
});
test('atraso é derivado: vence hoje pendente, ontem atrasado, confirmado não atrasado', () => {
  const b = { status: 'pending', dueDate: '2026-12-31' };
  assert.equal(commitmentStatus(b, '2026-12-31'), 'pending'); assert.equal(commitmentStatus(b, '2027-01-01'), 'overdue'); assert.equal(commitmentStatus({ ...b, status: 'settled' }, '2027-01-01'), 'settled');
});
test('resumos usam vencimento para pendentes e data efetiva para histórico; atraso não duplica total', async () => {
  const f = await fixture(); const b = await add(f, 'payable', { dueDate: '2025-12-31' }); await add(f, 'payable', { dueDate: '2025-12-15' }); await f.store.settleCommitment(b.id, '2026-01-02', 4000);
  assert.deepEqual(commitmentSummary(f.data().commitments, 'payable', '2025-12', '2026-01-03'), { pendingCents: 4500, overdueCents: 4500, settledCents: 0 }); assert.equal(commitmentSummary(f.data().commitments, 'payable', '2026-01', '2026-01-03').settledCents, 4000);
});
test('projeção tem horizonte definido e não conta renda planejada nem contas confirmadas', async () => {
  const f = await fixture(); const b = await add(f, 'receivable', { dueDate: localDate(), amountCents: 10000 }); await add(f, 'payable', { dueDate: localDate(), amountCents: 3000 }); await add(f, 'receivable', { dueDate: '2099-01-01', amountCents: 100000 });
  const balance = summarize(f.data().transactions, localDate().slice(0,7)).balanceCents;
  assert.equal(projectedBalance(balance, f.data().commitments, localDate(), localDate()), balance + 7000); await f.store.settleCommitment(b.id, localDate(), 9000);
  assert.equal(projectedBalance(balance + 9000, f.data().commitments, localDate(), localDate()), balance + 6000);
});
test('corrige efetivo sem duplicar; editar previsão preserva Extrato e exige ciência', async () => {
  const f = await fixture(), b = await add(f); await f.store.settleCommitment(b.id, localDate(), 4500); const id = f.data().commitments[0].transactionId;
  await assert.rejects(f.store.saveCommitment(input(f.data()), b.id), /correção/); await f.store.saveCommitment(input(f.data(), 'payable', { amountCents: 8000 }), b.id, false, true); assert.equal(f.data().transactions.find(t => t.id === id).amountCents, 4500);
  await f.store.settleCommitment(b.id, localDate(), 7000, true); assert.equal(f.data().transactions.filter(t => t.id === id).length, 1); assert.equal(f.data().commitments[0].actualAmountCents, 7000);
});
test('edição no Extrato sincroniza efetivo; exclusão direta e troca de tipo são bloqueadas', async () => {
  const f = await fixture(), b = await add(f); await f.store.settleCommitment(b.id, localDate(), 4500); const tx = f.data().transactions.at(-1);
  await f.store.updateTransaction(tx.id, { ...tx, amountCents: 3900 }); assert.equal(f.data().commitments[0].actualAmountCents, 3900); await assert.rejects(f.store.deleteTransaction(tx.id), /Contas/); await assert.rejects(f.store.updateTransaction(tx.id, { ...tx, type: 'income' }), /tipo/);
});
test('excluir confirmado exige escolha; manter Extrato remove somente vínculo', async () => {
  const f = await fixture(), b = await add(f); await f.store.settleCommitment(b.id, localDate(), 4500); const length = f.data().transactions.length;
  await assert.rejects(f.store.deleteCommitment(b.id)); await f.store.deleteCommitment(b.id, 'keep-transaction'); assert.equal(f.data().transactions.length, length); assert.equal(f.data().transactions.at(-1).commitmentId, undefined);
});
test('exclusão específica conjunta ou desfazer remove Transação uma só vez', async () => {
  const f = await fixture(), b = await add(f); await f.store.settleCommitment(b.id, localDate(), 4500); await f.store.undoCommitment(b.id); assert.equal(f.data().commitments[0].status, 'pending'); assert.deepEqual(f.data().transactions, f.initial.transactions);
  await f.store.settleCommitment(b.id, localDate(), 4500); await f.store.deleteCommitment(b.id, 'delete-transaction'); assert.deepEqual(f.data().transactions, f.initial.transactions);
});
test('recorrência mensal usa último dia, ano bissexto e volta ao dia 31', () => {
  assert.equal(monthlyDueDate('2026-01-31', '2026-02'), '2026-02-28'); assert.equal(monthlyDueDate('2024-01-31', '2024-02'), '2024-02-29'); assert.equal(monthlyDueDate('2026-01-31', '2026-03'), '2026-03-31'); assert.equal(shiftMonth('2026-12', 1), '2027-01');
});
test('recorrência persiste cursor, não duplica nem recria ocorrência excluída; nunca cria transações', async () => {
  const f = await fixture(); await add(f, 'payable', { dueDate: `${localDate().slice(0,7)}-01` }, true); const count = f.data().commitments.length, b = f.data().commitments[1];
  assert.ok(count >= 12); await f.store.deleteCommitment(b.id); await f.store.refreshCommitmentRecurrences(); assert.equal(f.data().commitments.length, count - 1);
  const reload = createFinanceStore(f.repo); await reload.initialize(); assert.equal(reload.getSnapshot().data.commitments.length, count - 1); assert.deepEqual(f.data().transactions, f.initial.transactions);
  await f.store.refreshCommitmentRecurrences(`${shiftMonth(localDate().slice(0,7), 1)}-01`); assert.equal(f.data().commitments.length, count); assert.equal(new Set(f.data().commitments.map(b => b.id)).size, count);
});
test('editar regra altera apenas pendentes futuras; encerrar preserva histórico e impede expansão', async () => {
  const f = await fixture(); await add(f, 'receivable', {}, true); const first = f.data().commitments[0], rule = f.data().commitmentRecurrences[0]; await f.store.settleCommitment(first.id, localDate(), 4500);
  await f.store.updateCommitmentRecurrence(rule.id, input(f.data(), 'receivable', { amountCents: 9000, dueDate: rule.dueDate })); assert.equal(f.data().commitments[0].amountCents, 4500); assert.equal(f.data().commitments[1].amountCents, 9000);
  await f.store.stopCommitmentRecurrence(rule.id); const count = f.data().commitments.length; await f.store.refreshCommitmentRecurrences(`${shiftMonth(localDate().slice(0,7), 2)}-01`); assert.equal(f.data().commitments.length, count);
});
test('categorias vinculadas a previsões e regras não podem ser excluídas ou mudar de tipo', async () => {
  const f = await fixture(); const b = await add(f); await assert.rejects(f.store.deleteCategory(b.categoryId)); await assert.rejects(f.store.saveCategory({ name: 'Mudança', type: 'income' }, b.categoryId));
});
test('dados v2 antigos são preservados, sem precisar alterar versão ou criar mocks de contas', async () => {
  const f = await fixture(); assert.equal(f.data().version, 2); assert.equal(f.data().commitments, undefined); assert.deepEqual(f.data(), f.initial); validateFinanceData(f.data());
});
test('vínculos inválidos e IDs repetidos são recusados na carga', async () => {
  const f = await fixture(), b = await add(f); const data = JSON.parse(f.raw()); data.commitments.push(b); assert.throws(() => validateFinanceData(data));
  const broken = JSON.parse(f.raw()); broken.commitments[0].status = 'settled'; assert.throws(() => validateFinanceData(broken));
});
test('isolamento por API/conta e reload preservam somente compromissos do dono', async () => {
  const values = new Map(); const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k,v) => { values.set(k,v); } };
  const aRepo = createAccountFinanceRepository(storage, 'http://api', { id: 'a', name: 'Ana', avatar: '💰' }); const a = createFinanceStore(aRepo); await a.initialize(); await a.saveCategory({name:'Essencial',type:'expense'}); await a.saveCommitment(input(a.getSnapshot().data));
  for (const [api,id] of [['http://api','b'], ['http://outra-api','a']]) { const b = createFinanceStore(createAccountFinanceRepository(storage, api, { id, name: 'Outro', avatar: '💰' })); await b.initialize(); assert.equal(b.getSnapshot().data.commitments, undefined); }
  const reload = createFinanceStore(aRepo); await reload.initialize(); assert.equal(reload.getSnapshot().data.commitments.length, 1);
});

test('recorrência no último ano suportado não ultrapassa o calendário', async () => {
  const f = await fixture(); await add(f, 'payable', { dueDate: '9999-12-31' }, true); assert.equal(f.data().commitments.length, 1); assert.equal(f.data().commitments[0].dueDate, '9999-12-31');
});

test('falha ao ampliar recorrência na abertura mantém finanças anteriores acessíveis', async () => {
  const f = await fixture(); await add(f, 'payable', {}, true);
  const old = JSON.parse(f.raw());
  const rule = old.commitmentRecurrences[0]; rule.generatedThrough = rule.dueDate.slice(0, 7);
  old.commitments = old.commitments.filter(b => b.occurrenceMonth === rule.generatedThrough);
  const raw = JSON.stringify(old);
  const repo = createFinanceRepository({ getItem: async () => raw, setItem: async () => { throw Error('quota'); } });
  const reload = createFinanceStore(repo); await reload.initialize();
  assert.equal(reload.getSnapshot().status, 'ready'); assert.deepEqual(reload.getSnapshot().data, old); assert.match(reload.getSnapshot().error, /recorrências/);
});
