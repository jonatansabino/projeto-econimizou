import type { Dispatch, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BirthDatePicker } from '@/components/birth-date-picker';
import { Field, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { financialObjectives, type PersonalizationDraft } from '@/domain/personalization';
import { maskMoney } from '@/domain/transaction-form';

export function PersonalizationFields({ value, onChange, errors, disabled = false }: { value: PersonalizationDraft; onChange: Dispatch<SetStateAction<PersonalizationDraft>>; errors: Record<string, string>; disabled?: boolean }) {
  const change = (key: keyof PersonalizationDraft, next: string) => onChange(current => ({ ...current, [key]: next }));
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 8 }}>
      <BirthDatePicker error={!!errors.birth_date} value={value.birth_date} onChange={date => change('birth_date', date)} disabled={disabled} />
      {!!errors.birth_date && <Text accessibilityRole="alert" style={ui.error}>{errors.birth_date}</Text>}
    </View>
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>Objetivo financeiro (opcional)</Text>
      {[...financialObjectives, { value: '', label: 'Prefiro escolher depois' }].map(option => <Pressable key={option.value} accessibilityRole="radio" aria-checked={value.financial_objective === option.value} accessibilityLabel={option.label} accessibilityState={{ checked: value.financial_objective === option.value, disabled }} disabled={disabled} onPress={() => change('financial_objective', option.value)}
        style={({ pressed }) => ({ minHeight: 48, borderWidth: 1, borderColor: value.financial_objective === option.value ? colors.primary : colors.border, backgroundColor: value.financial_objective === option.value ? '#16392F' : colors.background, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', opacity: pressed || disabled ? 0.55 : 1 })}>
        <Text style={{ color: colors.primary }}>{value.financial_objective === option.value ? '●' : '○'}</Text><Text style={[ui.text, { color: colors.text, flex: 1 }]}>{option.label}</Text>
      </Pressable>)}
      {!!errors.financial_objective && <Text accessibilityRole="alert" style={ui.error}>{errors.financial_objective}</Text>}
    </View>
    <Field label="Renda mensal (opcional)" placeholder="R$ 0,00" value={value.monthly_income_cents} onChangeText={text => change('monthly_income_cents', maskMoney(text))} keyboardType="number-pad" editable={!disabled} error={errors.monthly_income_cents} />
    <Text style={ui.text}>A renda informada será usada para planejamento e não altera seu saldo. Para registrar dinheiro recebido, utilize o Extrato.</Text>
  </View>;
}
