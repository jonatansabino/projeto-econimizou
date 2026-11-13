import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UpcomingCommitments } from '@/components/upcoming-commitments';
import { FinancialSummary } from '@/components/financial-summary';
import { MonthlyReceiptCard } from '@/components/monthly-receipt-card';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Screen } from '@/components/screen';
import { TransactionList } from '@/components/transaction-list';
import { Button, Chips, IconButton, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { filterTransactions } from '@/domain/features';
import { useFinance } from '@/state/finance-context';

export default function HomeScreen() {
  const { data, legacyDataPresent } = useFinance();
  const [categoryId, setCategory] = useState('');
  const latest = filterTransactions(data.transactions, { categoryId }).slice(0, 5);
  const unread = data.notifications.some((item) => !item.read);
  return <Screen title="Seu dinheiro, mais leve." description="Mais clareza hoje. Mais possibilidades amanhã.">
    <View style={ui.between}>
      <View style={[ui.row, { flex: 1, flexWrap: 'nowrap', minWidth: 0 }]}><ProfileAvatar photoRef={data.profile.photoRef} value={data.profile.avatar} label={`Avatar de ${data.profile.name}`} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={ui.text}>Olá, {data.profile.name} 👋</Text><Text style={ui.label}>Que bom ter você aqui.</Text></View></View>
      <IconButton label={unread ? 'Notificações Não lidas' : 'Notificações'} icon="notifications-outline" badge={unread} onPress={() => router.push('/notificacoes')} />
    </View>
    <FinancialSummary />
    <MonthlyReceiptCard />
    <Text style={styles.note}>Receitas, despesas e categorias salvas na sua conta</Text>
    {legacyDataPresent && <View style={ui.card}><Text style={ui.label}>Dados anteriores preservados</Text><Text style={ui.text}>Seus registros antigos continuam neste aparelho, sem vínculo automático com esta conta. A importação será disponibilizada em uma etapa futura, com sua confirmação.</Text></View>}
    <Text style={ui.title}>O que vamos fazer?</Text>
    <View style={styles.actions}>
      <View style={styles.action}><Button label="Registrar Gasto" icon="add-circle-outline" onPress={() => router.push({ pathname: '/transacao', params: { type: 'expense' } })} /></View>
      <View style={styles.action}><Button label="Relatórios" icon="bar-chart-outline" secondary onPress={() => router.push('/relatorios')} /></View>
      <View style={styles.action}><Button label="Meta de Economia" icon="flag-outline" secondary onPress={() => router.push('/metas')} /></View>
    </View>
    <UpcomingCommitments />
    <View style={ui.between}><Text style={ui.title}>Últimas transações</Text><Button label="Ver extrato" secondary onPress={() => router.push('/extrato')} /></View>
    <Chips label="Categoria" value={categoryId} onChange={setCategory} options={[{ label: 'Todas', value: '' }, ...data.categories.map((item) => ({ label: item.name, value: item.id }))]} />
    <TransactionList transactions={latest} />
  </Screen>;
}
const styles = StyleSheet.create({
  note: { color: colors.muted, fontSize: 11 },
  actions: { gap: 10, flexDirection: 'row', flexWrap: 'wrap' },
  action: { flexGrow: 1, flexBasis: 150 },
});
