import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { commitmentStatus, statusLabel, type Commitment } from '@/domain/commitments';
import { displayDate } from '@/domain/features';
import { formatMoney } from '@/domain/finance';

export function CommitmentRow({ bill, today, hidden }: { bill: Commitment; today: string; hidden: boolean }) {
  const status = commitmentStatus(bill, today);
  const color = status === 'settled' ? colors.primary : status === 'overdue' ? '#FDA4AF' : '#FDBA74';
  return <View style={{ gap: 6 }}>
    <Text style={ui.label}>{bill.description}</Text>
    <View style={ui.row}><Ionicons name={status === 'settled' ? 'checkmark-circle-outline' : status === 'overdue' ? 'alert-circle-outline' : 'time-outline'} size={19} color={color} /><Text style={{ color }}>{bill.type === 'payable' ? 'A pagar' : 'A receber'} · {statusLabel(bill, today)}</Text></View>
    <Text style={ui.text}>Vencimento: {displayDate(bill.dueDate)} · {hidden ? '••••••' : formatMoney(bill.amountCents)}</Text>
    {bill.status === 'settled' && <Text style={ui.success}>Efetivo em {displayDate(bill.actualDate!)}: {hidden ? '••••••' : formatMoney(bill.actualAmountCents!)}</Text>}
    {!!bill.notes && <Text style={ui.text}>{bill.notes}</Text>}
    {!!bill.recurrenceId && <Text style={ui.text}>Ocorrência mensal</Text>}
  </View>;
}
