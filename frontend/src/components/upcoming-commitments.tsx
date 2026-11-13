import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { CommitmentRow } from '@/components/commitment-row';
import { Button, ui } from '@/components/ui';
import { projectedBalance } from '@/domain/commitments';
import { displayDate } from '@/domain/features';
import { formatMoney, localDate } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export function UpcomingCommitments() {
  const { data, today, summary } = useFinance();
  const pending = (data.commitments ?? []).filter(b => b.status === 'pending');
  const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + 30); const until = localDate(date);
  const upcoming = pending.filter(b => b.dueDate <= until).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const money = (cents: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(cents);
  return <View style={ui.card}>
    <View style={ui.between}><Text style={ui.title}>Próximos compromissos</Text><Button label="Ver todas" secondary onPress={() => router.push('/contas')} /></View>
    <Text style={ui.text}>{pending.filter(b => b.type === 'payable').length} contas a pagar · {pending.filter(b => b.type === 'receivable').length} recebimentos previstos · {pending.filter(b => b.dueDate < today).length} atrasados (todos os períodos)</Text>
    <Text style={ui.label}>Saldo atual: {money(summary.balanceCents)}</Text>
    <Text style={ui.success}>Saldo projetado (estimativa): {money(projectedBalance(summary.balanceCents, pending, today, until))}</Text>
    <Text style={ui.text}>De {displayDate(today)} a {displayDate(until)}. Só considera pendências com vencimento nesse horizonte. Atrasados anteriores ficam fora da projeção; renda planejada não entra.</Text>
    {upcoming.map(bill => <CommitmentRow key={bill.id} bill={bill} today={today} hidden={data.preferences.hideAmounts} />)}
    {!upcoming.length && <Text style={ui.text}>Nenhum compromisso próximo. Toque em Ver todas para cadastrar contas a pagar ou a receber.</Text>}
  </View>;
}
