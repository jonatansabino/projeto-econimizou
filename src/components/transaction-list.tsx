import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Empty, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { displayDate } from '@/domain/features';
import { formatMoney, type Transaction } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const { data } = useFinance();
  if (!transactions.length) return <Empty text="Nenhuma transação encontrada. Registre um movimento ou ajuste os filtros." />;
  return <View style={styles.list}>{transactions.map((item) => {
    const category = data.categories.find((entry) => entry.id === item.categoryId);
    return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Editar transação: ${item.description}`}
      onPress={() => router.push({ pathname: '/transacao', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.55 }]}>
      <View style={[styles.icon, item.type === 'income' && { backgroundColor: '#173C30' }]}><Ionicons name={item.type === 'income' ? 'arrow-down' : 'arrow-up'} color={item.type === 'income' ? colors.primary : '#FDA4AF'} size={20} /></View>
      <View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={ui.label}>{item.description}</Text><Text style={styles.meta}>{category?.name} · {displayDate(item.date)}</Text></View>
      <Text style={[styles.amount, item.type === 'income' && { color: colors.primary }]}>{data.preferences.hideAmounts ? '••••••' : `${item.type === 'expense' ? '−' : '+'}${formatMoney(item.amountCents)}`}</Text>
    </Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({
  list: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#38262C' },
  meta: { fontSize: 11, lineHeight: 17, color: colors.muted },
  amount: { color: colors.text, fontSize: 13, fontWeight: '700', maxWidth: '42%' },
});
