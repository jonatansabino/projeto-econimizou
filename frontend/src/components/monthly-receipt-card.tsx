import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { Button, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { formatMoney, totalIncomeSources } from '@/domain/finance';
import { calculateMonthlyReceipt, monthlyIncomeReceived } from '@/domain/monthly-receipt';
import { useAuth } from '@/state/auth-context';
import { useFinance } from '@/state/finance-context';

export function MonthlyReceiptCard() {
  const auth = useAuth();
  const { data, today } = useFinance();

  const referenceMonth = today.slice(0, 7);

  // Prioriza soma das fontes locais; fallback para campo único da API
  const sources = data.preferences.incomeSources ?? [];
  const plannedCents =
    sources.length > 0
      ? totalIncomeSources(sources)
      : (auth.user?.personalization?.monthly_income_cents ?? null);

  const receivedCents = useMemo(
    () => monthlyIncomeReceived(data.transactions, referenceMonth),
    [data.transactions, referenceMonth]
  );

  const progress = useMemo(
    () => calculateMonthlyReceipt(plannedCents, receivedCents, referenceMonth),
    [plannedCents, receivedCents, referenceMonth]
  );

  if (!progress) {
    return null;
  }

  const hide = data.preferences.hideAmounts;
  const display = (cents: number) => (hide ? '••••••' : formatMoney(cents));

  let contextualMessage = progress.message;
  if (hide) {
    if (progress.isExceeded) {
      contextualMessage = `Você superou sua renda prevista neste mês!`;
    } else if (progress.isReached) {
      contextualMessage = 'Você atingiu 100% da sua renda prevista neste mês!';
    } else {
      contextualMessage = `Você registrou ${progress.percent}% da sua renda prevista neste mês.`;
    }
  }

  function handleConfigureIncome() {
    router.push({
      pathname: '/(tabs)/configuracoes',
      params: { openIncome: '1' },
    });
  }

  return (
    <View
      accessibilityRole="region"
      accessibilityLabel={`Recebimento do mês: ${progress.referenceMonthLabel}`}
      style={styles.card}
    >
      <View style={ui.between}>
        <View style={{ flex: 1 }}>
          <Text style={styles.caption}>RECEBIMENTO DO MÊS</Text>
          <Text style={styles.monthTitle}>{progress.referenceMonthLabel}</Text>
        </View>
        <Text style={styles.percentageBadge}>{progress.percent}%</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Renda prevista</Text>
          <Text
            numberOfLines={1}
            style={styles.metricPlanned}
            accessibilityLabel={`Renda mensal prevista: ${display(progress.plannedCents)}`}
          >
            {display(progress.plannedCents)}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Valor recebido</Text>
          <Text
            numberOfLines={1}
            style={styles.metricReceived}
            accessibilityLabel={`Valor recebido no mês: ${display(progress.receivedCents)}`}
          >
            {display(progress.receivedCents)}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <ProgressBar
          value={progress.visualPercent}
          label={`Progresso de recebimento: ${progress.percent}%`}
        />
        <View style={styles.diffRow}>
          <Text style={styles.diffLabel}>
            {progress.isExceeded
              ? `Excedente: +${display(progress.surplusCents)}`
              : progress.isReached
                ? 'Meta de renda atingida'
                : `Falta receber: ${display(progress.remainingCents)}`}
          </Text>
          <Text style={styles.diffDetail}>
            {progress.percent}% recebido
          </Text>
        </View>
      </View>

      <Text style={styles.messageText}>{contextualMessage}</Text>

      <Button
        label="Configurar renda"
        secondary
        icon="options-outline"
        onPress={handleConfigureIncome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 24,
    borderRadius: 24,
    gap: 14,
  },
  caption: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  monthTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  percentageBadge: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  metricPlanned: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  metricReceived: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    gap: 6,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  diffLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  diffDetail: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  messageText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
