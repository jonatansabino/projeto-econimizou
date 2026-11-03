import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { FinancialCharts } from '@/components/financial-charts';
import { Screen } from '@/components/screen';
import { Chips, ui } from '@/components/ui';
import { availablePeriods, financialReport, monthLabel, reportRange } from '@/domain/analytics';
import { formatMoney } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export default function ReportsScreen() {
  const { data, today } = useFinance();
  const [period, setPeriod] = useState('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(today.slice(0, 4));
  const available = availablePeriods(data.transactions, today);
  const report = useMemo(() => financialReport(data.transactions, data.categories, reportRange(period, month, year, new Date(`${today}T12:00:00`))), [data.transactions, data.categories, period, month, year, today]);
  const money = (amount: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(amount);
  return <Screen title="Seu dinheiro em perspectiva" description="Veja para onde vai cada parte do seu orçamento." back>
    <Chips label="Período do relatório" value={period} onChange={setPeriod} options={[{ label: 'Este mês', value: 'month' }, { label: '7 dias', value: 'week' }, { label: 'Mês anterior', value: 'lastMonth' }, { label: 'Tudo', value: 'all' }, { label: 'Escolher mês', value: 'selectedMonth' }, { label: 'Escolher ano', value: 'year' }]} />
    {period === 'selectedMonth' && <Chips label="Mês do relatório" value={month} onChange={setMonth} options={available.months.map((value) => ({ label: monthLabel(value), value }))} />}
    {period === 'year' && <Chips label="Ano do relatório" value={year} onChange={setYear} options={available.years.map((value) => ({ label: value, value }))} />}
    <View style={ui.card}><Text style={ui.title}>Resumo do período</Text><Text style={ui.text}>{report.transactions.length} transações</Text><Text style={ui.success}>Receitas: {money(report.incomeCents)}</Text><Text style={ui.text}>Despesas: {money(report.expenseCents)}</Text><Text style={ui.label}>Resultado: {money(report.netCents)}</Text></View>
    <FinancialCharts report={report} />
    <View style={ui.card}><Text style={ui.label}>Uma leitura do seu momento</Text><Text style={ui.text}>{!report.transactions.length ? 'Comece registrando receitas e despesas para acompanhar seu orçamento.' : report.incomeCents >= report.expenseCents ? 'As receitas cobrem as despesas deste período. Avalie quanto pode reservar para suas metas.' : 'As despesas superam as receitas neste período. Revise os maiores gastos e ajuste seu planejamento.'}</Text></View>
  </Screen>;
}
