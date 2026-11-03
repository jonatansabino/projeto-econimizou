import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { Empty, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { chartColors, monthLabel, pieSegmentAt, type FinancialReport } from '@/domain/analytics';
import { formatMoney } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

// Seleções guardam identificadores, não totais, para detalhes acompanharem as edições.
export function FinancialCharts({ report }: { report: FinancialReport }) {
  const { data } = useFinance();
  const { width: screenWidth } = useWindowDimensions();
  const [measuredWidth, setWidth] = useState(Math.min(560, screenWidth - 80));
  const [segmentId, setSegment] = useState<string | null>(null);
  const [barSelection, setBar] = useState<{ month: string; type: 'income' | 'expense' } | null>(null);
  const [lineMonth, setLine] = useState<string | null>(null);
  const width = Math.max(160, Math.min(measuredWidth, screenWidth - 80));
  const money = (cents: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(cents);
  const segment = report.segments.find((item) => item.id === segmentId);
  const bar = report.monthly.find((item) => item.month === barSelection?.month);
  const point = report.monthly.find((item) => item.month === lineMonth);
  const radius = Math.min(width / 2 - 12, 110);
  const innerRadius = Math.min(width / 3 - 12, 70);
  const pieData = report.segments.map((item) => ({ value: item.total / 100, color: item.color }));
  const bars = report.monthly.flatMap((item) => [
    { value: item.incomeCents / 100, label: monthLabel(item.month), labelWidth: 64, frontColor: chartColors.income, spacing: 4, onPress: () => setBar({ month: item.month, type: 'income' }) },
    { value: item.expenseCents / 100, frontColor: chartColors.expense, spacing: 28, onPress: () => setBar({ month: item.month, type: 'expense' }) },
  ]);
  const lines = report.monthly.map((item) => ({ value: item.balanceCents / 100, label: monthLabel(item.month), onPress: () => setLine(item.month) }));
  if (!report.transactions.length) return <>
    <Empty text="Ainda não há despesas neste período para analisar." />
    <Empty text="Sem transações no período. Altere o filtro ou registre uma receita ou despesa para visualizar os gráficos." />
  </>;
  return <View style={ui.gap} onLayout={(event) => setWidth(event.nativeEvent.layout.width - 40)}>
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.title}>Despesas por categoria</Text>
      <Text style={ui.text}>Toque em uma fatia ou na legenda para ver os detalhes.</Text>
      {report.segments.length ? <>
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <View testID="chart-categories" style={{ width: radius * 2, height: radius * 2 }}>
            <View pointerEvents="none"><PieChart data={pieData} donut extraRadius={0} radius={radius} innerRadius={innerRadius} innerCircleColor={colors.surface} strokeColor={colors.surface} strokeWidth={0} /></View>
            <Pressable accessibilityLabel="Gráfico de despesas por categoria; detalhes disponíveis na legenda" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={(event) => {
              const native = event.nativeEvent as typeof event.nativeEvent & { offsetX?: number; offsetY?: number };
              const x = native.locationX ?? native.offsetX ?? Number.NaN;
              const y = native.locationY ?? native.offsetY ?? Number.NaN;
              const index = pieSegmentAt(x - radius, y - radius, radius, innerRadius, report.segments.map((item) => item.total));
              if (index >= 0) setSegment(report.segments[index].id);
            }} />
          </View>
        </View>
        {report.segments.map((item) => <Legend key={item.id} label={`Detalhar categoria: ${item.name}`} color={item.color} title={item.name} detail={`${money(item.total)} · ${item.percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} selected={segment?.id === item.id} onPress={() => setSegment(item.id)} />)}
        {segment && <View accessibilityLiveRegion="polite" testID="category-detail" style={stylesDetail}><Text style={ui.label}>{segment.name}</Text><Text style={ui.text}>{money(segment.total)} · {segment.percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% das despesas do período</Text></View>}
      </> : <Text style={ui.text}>Ainda não há despesas neste período para analisar.</Text>}
    </View>
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.title}>Receitas versus despesas</Text>
      <Text style={ui.text}>Valores em reais. Toque nas barras ou escolha um mês abaixo. Deslize o gráfico para percorrer períodos longos.</Text>
      <View testID="chart-comparison" style={{ overflow: 'hidden', paddingTop: 12 }}>
        <BarChart data={bars} width={width - 8} height={180} barWidth={26} barBorderRadius={5} initialSpacing={14} noOfSections={4} hideYAxisText yAxisLabelWidth={0} yAxisThickness={0} xAxisColor={colors.border} rulesColor={colors.border} xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }} labelsExtraHeight={24} isAnimated={false} />
      </View>
      <Text style={ui.text}><Text style={{ color: chartColors.income }}>● Receitas</Text>   <Text style={{ color: chartColors.expense }}>● Despesas</Text></Text>
      {report.monthly.map((item) => <View key={item.month} style={ui.row}>
        <View style={{ flex: 1 }}><Legend label={`Detalhar receitas: ${monthLabel(item.month)}`} color={chartColors.income} title={`${monthLabel(item.month)} · Receitas`} detail={money(item.incomeCents)} onPress={() => setBar({ month: item.month, type: 'income' })} /></View>
        <View style={{ flex: 1 }}><Legend label={`Detalhar despesas: ${monthLabel(item.month)}`} color={chartColors.expense} title="Despesas" detail={money(item.expenseCents)} onPress={() => setBar({ month: item.month, type: 'expense' })} /></View>
      </View>)}
      {bar && barSelection && <View testID="comparison-detail" accessibilityLiveRegion="polite" style={stylesDetail}>
        <Text style={ui.label}>{monthLabel(bar.month)} · {barSelection.type === 'income' ? 'Receitas' : 'Despesas'}</Text>
        <Text style={ui.text}>{money(barSelection.type === 'income' ? bar.incomeCents : bar.expenseCents)} · {((bar.incomeCents + bar.expenseCents) ? (barSelection.type === 'income' ? bar.incomeCents : bar.expenseCents) / (bar.incomeCents + bar.expenseCents) * 100 : 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% da movimentação do mês no período</Text>
      </View>}
    </View>
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.title}>Evolução do saldo por mês</Text>
      <Text style={ui.text}>O saldo acumula o histórico anterior ao filtro. No último mês, considera os registros até a data final do período.</Text>
      <View testID="chart-balance" style={{ overflow: 'hidden', paddingTop: 12 }}>
        <LineChart data={lines} width={width - 12} height={180} spacing={80} initialSpacing={24} endSpacing={30} color={chartColors.balance} thickness={3} dataPointsColor={chartColors.balance} dataPointsRadius={7} hideYAxisText yAxisLabelWidth={0} yAxisThickness={0} xAxisColor={colors.border} rulesColor={colors.border} xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }} focusEnabled onFocus={(_item: unknown, index: number) => setLine(report.monthly[index].month)} showTextOnFocus={false} isAnimated={false} />
      </View>
      <Text style={{ color: chartColors.balance, fontSize: 14 }}>● Saldo acumulado</Text>
      {report.monthly.map((item) => <Legend key={item.month} label={`Detalhar saldo: ${monthLabel(item.month)}`} title={monthLabel(item.month)} color={chartColors.balance} detail={money(item.balanceCents)} onPress={() => setLine(item.month)} selected={point?.month === item.month} />)}
      {point && <View testID="balance-detail" accessibilityLiveRegion="polite" style={stylesDetail}><Text style={ui.label}>Saldo em {monthLabel(point.month)}</Text><Text style={ui.text}>{money(point.balanceCents)}{ '\n' }Resultado do mês no período: {money(point.netCents)}</Text></View>}
    </View>
  </View>;
}
const stylesDetail = { backgroundColor: colors.background, borderRadius: 14, padding: 16, gap: 8 };
function Legend({ label, color, title, detail, onPress, selected = false }: { label: string; color: string; title: string; detail: string; onPress: () => void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 8, minHeight: 48, borderRadius: 12, backgroundColor: selected || pressed ? '#1B3030' : 'transparent', gap: 6 })}>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /><Text style={[ui.label, { flex: 1 }]}>{title}</Text></View><Text style={ui.text}>{detail}</Text>
  </Pressable>;
}
