import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, ErrorText, Field, IconButton, Sheet, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { calendarDays } from '@/domain/transaction-form';
import { displayDate, parseDate } from '@/domain/features';
import { isCivilDate, localDate } from '@/domain/finance';

// Calendário local reutilizável, sem conversão UTC nem módulo nativo adicional.
export function DatePicker({ value, onSelect, onClose, maximumDate }: { value: string; onSelect: (civil: string) => void; onClose: () => void; maximumDate?: string }) {
  const initial = (() => { try { return parseDate(value); } catch { return localDate(); } })();
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [jump, setJump] = useState(initial.slice(0, 7).split('-').reverse().join('/'));
  const [error, setError] = useState<string | null>(null);
  const [year, number] = month.split('-').map(Number);
  function change(delta: number) {
    const next = new Date(year, number - 1 + delta, 1);
    if (next.getFullYear() < 1900 || next.getFullYear() > 9999) return;
    const civil = localDate(next).slice(0, 7); if (maximumDate && civil > maximumDate.slice(0, 7)) return; setMonth(civil); setJump(civil.split('-').reverse().join('/')); setError(null);
  }
  return <Sheet title="Selecionar data" onClose={onClose}>
    <View style={ui.between}><IconButton label="Mês anterior no calendário" icon="chevron-back" onPress={() => change(-1)} /><Text style={ui.label}>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, number - 1, 1))}</Text><IconButton label="Próximo mês no calendário" icon="chevron-forward" onPress={() => change(1)} /></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <Text key={index} style={[ui.text, { width: `${100 / 7}%`, textAlign: 'center' }]}>{day}</Text>)}
      {calendarDays(year, number).map((day, index) => <View key={day ?? `blank-${index}`} style={{ width: `${100 / 7}%`, minHeight: 48 }}>{day && <Pressable accessibilityRole="button" accessibilityLabel={`Selecionar ${displayDate(day)}`} disabled={!!maximumDate && day > maximumDate} accessibilityState={{ selected: day === initial, disabled: !!maximumDate && day > maximumDate }} onPress={() => onSelect(day)} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: day === initial ? '#194434' : 'transparent', borderRadius: 10, opacity: maximumDate && day > maximumDate ? 0.25 : pressed ? 0.5 : 1 })}><Text style={{ color: day === initial ? colors.primary : colors.text }}>{Number(day.slice(-2))}</Text></Pressable>}</View>)}
    </View>
    <Field label="Ir para mês/ano" placeholder="MM/AAAA" value={jump} onChangeText={setJump} maxLength={7} />
    <Button label="Abrir mês" secondary onPress={() => { const parts = jump.split('/'); const civil = `${parts[1]}-${parts[0]}-01`; if (!isCivilDate(civil) || civil < '1900-01-01' || (maximumDate && civil.slice(0, 7) > maximumDate.slice(0, 7))) setError('Informe um mês válido no formato MM/AAAA dentro do período permitido.'); else { setMonth(civil.slice(0, 7)); setError(null); } }} />
    <ErrorText error={error} /><Button label="Selecionar hoje" secondary onPress={() => onSelect(localDate())} />
  </Sheet>;
}
