import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText, IconButton, Sheet, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { displayDate } from '@/domain/features';
import { formatMoney } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export function FinancialSummary() {
  const { data, summary, today, updatePreferences } = useFinance();
  const task = useTask();
  const [selectingIncome, setSelectingIncome] = useState(false);
  const monthlyIncome = data.transactions.filter((item) => item.type === 'income' && item.date.slice(0, 7) === today.slice(0, 7));
  function openIncome(id?: string) {
    setSelectingIncome(false);
    router.push({ pathname: '/transacao', params: id ? { id } : { type: 'income' } });
  }
  function editIncome() {
    if (monthlyIncome.length <= 1) openIncome(monthlyIncome[0]?.id);
    else setSelectingIncome(true);
  }
  const display = (cents: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(cents);
  return (
    <View style={styles.card}>
      <View style={ui.between}><Text style={styles.caption}>VISÃO GERAL</Text><IconButton label={data.preferences.hideAmounts ? 'Mostrar valores' : 'Ocultar valores'} icon={data.preferences.hideAmounts ? 'eye-off-outline' : 'eye-outline'} onPress={() => { if (!task.busy) void task.run(() => updatePreferences({ hideAmounts: !data.preferences.hideAmounts })); }} /></View>
      <ErrorText error={task.error} />
      <Text style={styles.label}>Saldo total</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={`Saldo total: ${display(summary.balanceCents)}`} style={styles.balance}>{display(summary.balanceCents)}</Text>
      <View style={styles.row}>
        <View style={styles.item}><Text style={styles.label}>Receitas do mês</Text><Text style={styles.income}>{display(summary.incomeCents)}</Text></View>
        <View style={styles.item}><Text style={styles.label}>Despesas do mês</Text><Text style={styles.expense}>{display(summary.expenseCents)}</Text></View>
      </View>
      <Button label={monthlyIncome.length ? 'Editar receitas do mês' : 'Adicionar receita do mês'} secondary icon="create-outline" onPress={editIncome} />
      {selectingIncome && <Sheet title="Receitas do mês" onClose={() => setSelectingIncome(false)}>
        <Text style={ui.text}>O total é a soma das receitas deste mês. Escolha o registro cujo valor deseja alterar.</Text>
        {monthlyIncome.map((item) => <View key={item.id} style={{ gap: 8 }}>
          <Button label={`Editar receita: ${item.description}`} secondary icon="create-outline" onPress={() => openIncome(item.id)} />
          <Text style={ui.text}>{displayDate(item.date)} · {display(item.amountCents)}</Text>
        </View>)}
        <Button label="Adicionar outra receita" icon="add" onPress={() => openIncome()} />
      </Sheet>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 24, borderRadius: 24, gap: 14 },
  caption: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  label: { color: colors.muted, fontSize: 14 },
  balance: { color: colors.text, fontSize: 34, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  item: { gap: 8, flexGrow: 1 },
  income: { color: colors.primary, fontSize: 18, fontWeight: '600' },
  expense: { color: '#FDA4AF', fontSize: 18, fontWeight: '600' },
});
