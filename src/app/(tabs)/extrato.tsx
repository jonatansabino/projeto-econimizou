import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { TransactionList } from '@/components/transaction-list';
import { Button, Chips, ErrorText, Field, ui } from '@/components/ui';
import { filterTransactions, parseDate, periodRange, transactionTotals } from '@/domain/features';
import { formatMoney } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export default function StatementScreen() {
  const { data } = useFinance();
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('month');
  const [type, setType] = useState('all');
  const [categoryId, setCategory] = useState('');
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const transactions = filterTransactions(data.transactions, { query, type, categoryId, ...(period === 'custom' ? range : periodRange(period)) });
  const { incomeCents: income, expenseCents: expense } = transactionTotals(transactions);
  const money = (amount: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(amount);
  function reset() { setQuery(''); setPeriod('all'); setType('all'); setCategory(''); setRange({}); setStart(''); setEnd(''); setError(null); setLimit(30); }
  function applyRange() {
    try {
      const next = { start: parseDate(start), end: parseDate(end) };
      if (next.start > next.end) throw new Error('A data inicial deve ser anterior à final.');
      setRange(next); setError(null);
    } catch (cause) { setError((cause as Error).message); }
  }
  return <Screen title="Extrato" description="Cada entrada e saída, no seu lugar.">
    <Button label="Nova transação" icon="add" onPress={() => router.push('/transacao')} />
    <Field label="Pesquisar transações" placeholder="Ex.: almoço, salário…" value={query} onChangeText={setQuery} />
    <Chips label="Período" value={period} onChange={(value) => { setPeriod(value); setError(null); }} options={[{ label: 'Este mês', value: 'month' }, { label: '7 dias', value: 'week' }, { label: 'Mês anterior', value: 'lastMonth' }, { label: 'Tudo', value: 'all' }, { label: 'Personalizado', value: 'custom' }]} />
    {period === 'custom' && <View style={ui.card}>
      <Field label="Data inicial" placeholder="DD/MM/AAAA" value={start} onChangeText={setStart} />
      <Field label="Data final" placeholder="DD/MM/AAAA" value={end} onChangeText={setEnd} />
      <Button label="Aplicar período" secondary onPress={applyRange} /><ErrorText error={error} />
      <Text style={ui.text}>{range.start ? `Período aplicado: ${range.start} a ${range.end}` : 'Defina e aplique as duas datas. Até lá, todos os períodos são exibidos.'}</Text>
    </View>}
    <Chips label="Tipo" value={type} onChange={(value) => { setType(value); setCategory(''); }} options={[{ label: 'Todos', value: 'all' }, { label: 'Despesas', value: 'expense' }, { label: 'Receitas', value: 'income' }]} />
    <Chips label="Categoria" value={categoryId} onChange={setCategory} options={[{ label: 'Todas', value: '' }, ...data.categories.filter((item) => type === 'all' || item.type === type).map((item) => ({ label: item.name, value: item.id }))]} />
    <Button label="Limpar filtros" secondary onPress={reset} />
    <View style={ui.card}><Text style={ui.label}>Resultado dos filtros · {transactions.length} transações</Text><Text style={ui.text}>Receitas: {money(income)}{ '\n' }Despesas: {money(expense)}{ '\n' }Resultado: {money(income - expense)}</Text></View>
    <Text style={ui.text}>Toque em uma transação para editar ou excluir.</Text>
    <TransactionList transactions={transactions.slice(0, limit)} />
    {transactions.length > limit && <Button label="Carregar mais transações" secondary onPress={() => setLimit(limit + 30)} />}
  </Screen>;
}
