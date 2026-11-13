import { CommitmentForm, CommitmentSettlement } from '@/components/commitment-form';
import { CommitmentRow } from '@/components/commitment-row';
import { Screen } from '@/components/screen';
import { Button, Chips, Empty, ErrorText, Field, Sheet, ui, useTask } from '@/components/ui';
import { commitmentStatus, commitmentSummary, type Commitment, type CommitmentType } from '@/domain/commitments';
import { normalize } from '@/domain/features';
import { formatMoney } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

type Overlay = { kind: 'new' } | { kind: 'edit' | 'settle' | 'correct' | 'delete' | 'undo' | 'rule' | 'stop' | 'actions'; bill: Commitment };
export default function AccountsScreen() {
  const finance = useFinance(); const { data, today } = finance;
  const [type, setType] = useState<CommitmentType>('payable');
  const [month, setMonth] = useState(today.slice(0, 7)); const [period, setPeriod] = useState(today.slice(0, 7).split('-').reverse().join('/'));
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [status, setStatus] = useState('all'); const [query, setQuery] = useState('');
  const [overlay, setOverlay] = useState<Overlay | null>(null); const [notice, setNotice] = useState<string | null>(null);
  function open(next: Overlay) { setNotice(null); setOverlay(next); }
  const bills = data.commitments ?? [];
  const totals = commitmentSummary(bills, type, month, today);
  const money = (cents: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(cents);
  const visible = bills.filter(b => b.type === type && (!month || (b.status === 'settled' ? b.actualDate : b.dueDate)?.startsWith(month)) && (status === 'all' || commitmentStatus(b, today) === status) && normalize(b.description).includes(normalize(query))).sort((a,b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  const close = () => setOverlay(null);
  const success = () => { setNotice('Alteração salva. Home, Extrato e Relatórios atualizados.'); close(); };
  const selected = overlay && 'bill' in overlay ? overlay.bill : null;
  const rule = selected?.recurrenceId ? data.commitmentRecurrences?.find(r => r.id === selected.recurrenceId) : undefined;
  return <Screen back title="Contas" description="Planeje vencimentos e confirme somente o que realmente movimentou seu dinheiro.">
    <Chips label="Tipo de conta" value={type} onChange={value => { setType(value as CommitmentType); setStatus('all'); }} options={[{ label: 'Contas a Pagar', value: 'payable', icon: 'arrow-up-circle-outline' }, { label: 'Contas a Receber', value: 'receivable', icon: 'arrow-down-circle-outline' }]} />
    <View style={ui.card}>
      <Field label="Mês e ano (MM/AAAA)" value={period} onChangeText={setPeriod} maxLength={7} error={periodError ?? undefined} keyboardType="numbers-and-punctuation" />
      <View style={ui.row}><Button label="Aplicar período" secondary onPress={() => { const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(period); if (!match || Number(match[2]) < 1900) setPeriodError('Informe MM/AAAA válido.'); else { setMonth(`${match[2]}-${match[1]}`); setPeriodError(null); } }} /><Button label="Todos os períodos" secondary onPress={() => { setMonth(''); setPeriodError(null); }} /></View>
      <Text style={ui.text}>{month ? `Período: ${month.split('-').reverse().join('/')}` : 'Todos os períodos'}. Pendentes e atrasadas usam vencimento; histórico usa data efetiva. Atrasados já fazem parte do total pendente.</Text>
      <Text style={ui.label}>{type === 'payable' ? 'Total pendente' : 'Total previsto'}: {money(totals.pendingCents)}</Text>
      <Text style={ui.error}>Total atrasado: {money(totals.overdueCents)}</Text>
      <Text style={ui.success}>{type === 'payable' ? 'Total pago' : 'Total recebido'} no período: {money(totals.settledCents)}</Text>
    </View>
    <Button label={type === 'payable' ? 'Nova conta a pagar' : 'Nova conta a receber'} icon="add-circle-outline" onPress={() => { setNotice(null); open({ kind: 'new' }); }} />
    <Field label="Pesquisar compromissos" value={query} onChangeText={setQuery} placeholder="Descrição" />
    <Chips label="Situação da conta" value={status} onChange={setStatus} options={[{ label: 'Todas', value: 'all' }, { label: 'Pendentes', value: 'pending' }, { label: type === 'payable' ? 'Atrasadas' : 'Atrasados', value: 'overdue' }, { label: type === 'payable' ? 'Pagas' : 'Recebidos', value: 'settled' }]} />
    {notice && <Text accessibilityLiveRegion="polite" style={ui.success}>{notice}</Text>}
    <ErrorText error={finance.error} />
    {finance.error && data.commitmentRecurrences?.some(rule => rule.active) && <CommitmentRetry onRetry={() => finance.refreshCommitmentRecurrences(today)} />}
    <Text style={ui.text}>Ordenado por vencimento, do mais antigo para o mais próximo.</Text>
    {visible.map(bill => <View key={bill.id} style={ui.card}><CommitmentRow bill={bill} today={today} hidden={data.preferences.hideAmounts} />
      {bill.status === 'pending' && <Button label={bill.type === 'payable' ? 'Marcar como pago' : 'Marcar como recebido'} onPress={() => open({ kind: 'settle', bill })} />}
      <Button label={`Gerenciar ${bill.description}`} secondary onPress={() => open({ kind: 'actions', bill })} />
    </View>)}
    {!visible.length && <Empty text="Nenhum compromisso neste filtro. Cadastre uma previsão ou consulte outro período para ver seu histórico." />}
    {overlay?.kind === 'new' && <CommitmentForm type={type} onClose={close} onSave={async (input, monthly) => { await finance.saveCommitment(input, undefined, monthly); setNotice('Previsão salva. Nenhuma Transação foi criada.'); }} />}
    {overlay?.kind === 'edit' && selected && <CommitmentForm type={selected.type} initial={selected} editing onClose={close} onSave={async input => { await finance.saveCommitment(input, selected.id, false, selected.status === 'settled'); setNotice('Previsão atualizada. O lançamento efetivo foi preservado.'); }} />}
    {(overlay?.kind === 'settle' || overlay?.kind === 'correct') && selected && <CommitmentSettlement description={selected.description} amountCents={selected.actualAmountCents ?? selected.amountCents} initialDate={selected.actualDate} correction={overlay.kind === 'correct'} onClose={close} onConfirm={async (date, amount) => { await finance.settleCommitment(selected.id, date, amount, overlay.kind === 'correct'); setNotice('Movimentação salva. Home, Extrato e Relatórios atualizados.'); }} />}
    {overlay?.kind === 'actions' && selected && <Sheet title="Gerenciar compromisso" onClose={close}>
      <CommitmentRow bill={selected} today={today} hidden={data.preferences.hideAmounts} />
      {selected.status === 'settled' && <><Text style={ui.text}>Conta confirmada e vinculada ao Extrato. Editar a previsão não altera a movimentação efetiva. Para corrigir o saldo, use as ações explícitas abaixo.</Text><Button label="Corrigir valor ou data efetivos" onPress={() => open({ kind: 'correct', bill: selected })} /><Button label="Ver lançamento no Extrato" secondary onPress={() => { close(); router.push({ pathname: '/transacao', params: { id: selected.transactionId! } }); }} /><Button label="Desfazer confirmação" secondary danger onPress={() => open({ kind: 'undo', bill: selected })} /></>}
      <Button label="Editar apenas esta previsão" secondary onPress={() => open({ kind: 'edit', bill: selected })} />
      {rule?.active && <><Button label="Editar recorrência mensal" secondary onPress={() => open({ kind: 'rule', bill: selected })} /><Button label="Encerrar recorrência" secondary onPress={() => open({ kind: 'stop', bill: selected })} /></>}
      {rule && !rule.active && <Text style={ui.text}>Recorrência encerrada. Ocorrências existentes foram preservadas.</Text>}
      <Button label="Excluir compromisso" secondary danger onPress={() => open({ kind: 'delete', bill: selected })} /><Button label="Fechar" secondary onPress={close} />
    </Sheet>}
    {overlay?.kind === 'rule' && rule && <CommitmentForm type={rule.type} initial={rule} recurrence onClose={close} onSave={async input => { await finance.updateCommitmentRecurrence(rule.id, input); setNotice('Recorrência atualizada. Histórico efetivo preservado.'); }} />}
    {overlay?.kind === 'stop' && rule && <CommitmentAction title="Encerrar recorrência?" text="Impede novas ocorrências. Contas já criadas, incluindo futuras, permanecem e podem ser gerenciadas individualmente. Nenhum lançamento será excluído." label="Confirmar encerramento" onClose={close} onConfirm={async () => { await finance.stopCommitmentRecurrence(rule.id); success(); }} />}
    {overlay?.kind === 'undo' && selected && <CommitmentAction title="Desfazer confirmação?" text="Exclui especificamente a Transação vinculada, reabre esta conta como pendente e recalcula o saldo. Essa ação altera o Extrato." label="Desfazer e excluir lançamento" onClose={close} onConfirm={async () => { await finance.undoCommitment(selected.id); success(); }} />}
    {overlay?.kind === 'delete' && selected && <CommitmentDeletion bill={selected} onClose={close} onConfirm={async action => { await finance.deleteCommitment(selected.id, action); success(); }} />}
  </Screen>;
}
function CommitmentAction({ title, text, label, onConfirm, onClose }: { title: string; text: string; label: string; onConfirm(): Promise<unknown>; onClose(): void }) {
  const task = useTask(); const locked = useRef(false);
  return <Sheet title={title} onClose={() => { if (!locked.current) onClose(); }}><Text style={ui.text}>{text}</Text><ErrorText error={task.error} /><Button label={label} loading={task.busy} onPress={() => { if (locked.current) return; locked.current = true; void task.run(onConfirm).then(ok => { if (!ok) locked.current = false; }); }} /><Button label="Cancelar" secondary disabled={task.busy} onPress={onClose} /></Sheet>;
}
function CommitmentDeletion({ bill, onConfirm, onClose }: { bill: Commitment; onConfirm(action?: 'keep-transaction' | 'delete-transaction'): Promise<unknown>; onClose(): void }) {
  const task = useTask(); const locked = useRef(false);
  function run(action?: 'keep-transaction' | 'delete-transaction') { if (locked.current) return; locked.current = true; void task.run(() => onConfirm(action)).then(ok => { if (!ok) locked.current = false; }); }
  return <Sheet title="Excluir compromisso?" onClose={() => { if (!locked.current) onClose(); }}><Text style={ui.label}>{bill.description}</Text><Text style={ui.text}>{bill.status === 'settled' ? 'Esta conta tem um lançamento efetivo. Escolha se deseja manter o Extrato ou excluir também essa movimentação e recalcular o saldo.' : 'Excluir esta previsão não altera seu saldo.'} {bill.recurrenceId ? 'Apenas esta ocorrência será excluída. Use Encerrar recorrência para impedir novas ocorrências.' : ''}</Text><ErrorText error={task.error} />
    <Button label={bill.status === 'settled' ? 'Excluir só compromisso e manter lançamento' : 'Confirmar exclusão do compromisso'} loading={task.busy} danger secondary onPress={() => run(bill.status === 'settled' ? 'keep-transaction' : undefined)} />
    {bill.status === 'settled' && <Button label="Excluir compromisso e lançamento" disabled={task.busy} danger secondary onPress={() => run('delete-transaction')} />}
    <Button label="Cancelar" secondary disabled={task.busy} onPress={onClose} />
  </Sheet>;
}

function CommitmentRetry({ onRetry }: { onRetry(): Promise<unknown> }) {
  const task = useTask();
  return <><Button label="Tentar atualizar recorrências" secondary loading={task.busy} onPress={() => { if (!task.busy) void task.run(onRetry); }} /><ErrorText error={task.error} /></>;
}
