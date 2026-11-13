import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { birthDateOptions, birthDateParts, selectBirthDatePart, type BirthDatePart } from '@/domain/birth-date';

const labels = { day: 'Dia', month: 'Mês', year: 'Ano' };
const order: BirthDatePart[] = ['day', 'month', 'year'];
type Anchor = { part: BirthDatePart; x: number; y: number; width: number; height: number };

export function BirthDatePicker({ value, onChange, disabled = false, error = false }: { value: string; onChange: (value: string) => void; disabled?: boolean; error?: boolean }) {
  const [open, setOpen] = useState<Anchor | null>(null);
  const [focused, setFocused] = useState<BirthDatePart | null>(null);
  const triggers = useRef<Partial<Record<BirthDatePart, ComponentRef<typeof View> | null>>>({});
  const parts = birthDateParts(value);
  const options = birthDateOptions(value);
  const { width } = useWindowDimensions();
  const partial = !!value && (!parts.day || !parts.month || !parts.year);
  function close() {
    const trigger = open && triggers.current[open.part];
    Keyboard.dismiss();
    setOpen(null);
    if (Platform.OS === 'web') requestAnimationFrame(() => (trigger as unknown as { focus?: () => void } | null)?.focus?.());
  }
  return <View style={[styles.card, error && styles.errorBorder]}>
    <Text style={styles.title}>Data de nascimento</Text>
    <Text style={styles.hint}>Selecione sua data de nascimento (opcional).</Text>
    <View style={styles.fields}>
      {order.map(part => <View key={part} style={styles.field}>
        <Text style={styles.label}>{labels[part]}</Text>
        <Pressable ref={node => { triggers.current[part] = node; }} accessibilityRole="button" accessibilityLabel={`${labels[part]} de nascimento`} aria-invalid={error} onFocus={() => setFocused(part)} onBlur={() => setFocused(null)} accessibilityValue={{ text: parts[part] || 'Não informado' }} accessibilityState={{ disabled, expanded: open?.part === part }} disabled={disabled}
          onPress={() => triggers.current[part]?.measureInWindow((x, y, triggerWidth, height) => setOpen({ part, x, y, width: triggerWidth, height }))}
          style={({ pressed }) => [styles.trigger, { minHeight: Platform.OS === 'web' && width >= 480 ? 34 : 44 }, (open?.part === part || focused === part) && styles.focused, error && styles.errorBorder, (pressed || disabled) && { opacity: 0.55 }]}>
          <Text style={[styles.value, !parts[part] && { color: colors.muted }]}>{parts[part] }</Text>
          <Ionicons name="chevron-down" color={disabled ? colors.muted : colors.primary} size={13} />
        </Pressable>
      </View>)}
    </View>
    {partial && <Text style={styles.hint}>Complete dia, mês e ano ou use Limpar data no seletor.</Text>}
    {open && !disabled && <BirthDateDropdown anchor={open} options={options[open.part]} selected={parts[open.part]} onClear={value ? () => { onChange(''); close(); } : undefined} onClose={close} onSelect={option => { onChange(selectBirthDatePart(value, open.part, option)); close(); }} />}
  </View>;
}

function BirthDateDropdown({ anchor, options, selected, onClear, onClose, onSelect }: { anchor: Anchor; options: string[]; selected: string; onClear?: () => void; onClose: () => void; onSelect: (value: string) => void }) {
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rowHeight = Platform.OS === 'web' && screen.width >= 480 ? 30 : 44;
  const overlay = useRef<ComponentRef<typeof View>>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: screen.width, height: screen.height });
  const [keyboardTop, setKeyboardTop] = useState(() => Platform.OS === 'web' ? Infinity : Keyboard.metrics()?.screenY ?? Infinity);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => setKeyboardTop(event.endCoordinates.screenY));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(Infinity));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const filtered = options.filter(option => option.includes(query.trim()));
  const topLimit = Math.max(8, insets.top - bounds.y);
  const bottomLimit = Math.min(bounds.height - insets.bottom - 8, keyboardTop - bounds.y - 8);
  const triggerTop = anchor.y - bounds.y;
  const below = bottomLimit - triggerTop - anchor.height - 4;
  const aboveBottom = Math.min(triggerTop - 4, bottomLimit);
  const above = aboveBottom - topLimit;
  const placeAbove = below < 150 && above > below;
  const height = Math.max(80, Math.min(360, placeAbove ? above : below));
  const popupWidth = Math.min(Math.max(anchor.width, screen.width < 480 ? 148 : anchor.width), bounds.width - 16);
  const left = Math.max(8, Math.min(anchor.x - bounds.x, bounds.width - popupWidth - 8));
  const top = placeAbove ? Math.max(topLimit, aboveBottom - height) : Math.max(topLimit, triggerTop + anchor.height + 4);
  function positionSelected() {
    const index = query ? 0 : Math.max(0, filtered.indexOf(selected) - 4);
    scroll.current?.scrollTo({ y: index * rowHeight, animated: false });
  }
  return <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
    <View ref={overlay} style={{ flex: 1 }} onLayout={() => overlay.current?.measureInWindow((x, y, width, height) => setBounds({ x, y, width, height }))}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar seletor de nascimento" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal accessibilityLabel={`Opções de ${labels[anchor.part].toLowerCase()} de nascimento`} style={[styles.dropdown, { left, top, width: popupWidth, height }]}>
        <View style={[styles.search, searchFocused && styles.focused]}>
          <Ionicons name="search-outline" size={14} color={searchFocused ? colors.primary : colors.muted} />
          <TextInput accessibilityLabel={`Buscar ${labels[anchor.part].toLowerCase()} de nascimento`} value={query} onChangeText={setQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholderTextColor={colors.muted} autoFocus={Platform.OS === 'web'} autoCorrect={false} keyboardType="number-pad" selectionColor={colors.primary} style={styles.searchInput} />
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator onContentSizeChange={positionSelected} contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 6 }}>
          {filtered.map(option => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`${labels[anchor.part]}: ${option}`} accessibilityState={{ selected: selected === option }} onPress={() => onSelect(option)}
            style={({ pressed }) => [styles.option, { height: rowHeight }, selected === option && styles.selected, pressed && { backgroundColor: colors.border }]}>
            <View style={{ width: 16 }}>{selected === option && <Ionicons name="checkmark" size={14} color={colors.primary} />}</View>
            <Text style={[styles.optionText, selected === option && { color: colors.primary }]}>{option}</Text>
          </Pressable>)}
          {!filtered.length && <Text style={[styles.hint, { padding: 8 }]}>Nenhum resultado.</Text>}
        </ScrollView>
        {onClear && <Pressable accessibilityRole="button" accessibilityLabel="Limpar data de nascimento" onPress={onClear} style={({ pressed }) => [styles.option, { height: rowHeight, marginHorizontal: 6, borderTopWidth: 1, borderColor: colors.border, opacity: pressed ? 0.55 : 1 }]}>
          <Ionicons name="close-outline" size={16} color={colors.muted} /><Text style={styles.optionText}>Limpar data</Text>
        </Pressable>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  card: { minHeight: 170, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 10, gap: 10 },
  title: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, minWidth: 0, gap: 5 },
  label: { color: colors.text, fontSize: 12, lineHeight: 16 },
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.background },
  value: { color: colors.text, fontSize: 13, flexShrink: 1 },
  dropdown: { position: 'absolute', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingTop: 6, overflow: 'hidden', boxShadow: `0px 6px 12px ${colors.background}`, elevation: 12 },
  search: { backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: 6, marginBottom: 3, paddingHorizontal: 7, height: Platform.OS === 'web' ? 28 : 44, borderWidth: 1, borderColor: colors.border, borderRadius: 7 },
  searchInput: { flex: 1, minWidth: 0, color: colors.text, fontSize: 13, padding: 0, height: '100%', outlineWidth: 0, outlineStyle: 'solid' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, borderRadius: 7 },
  optionText: { fontSize: 12, color: colors.text },
  selected: { backgroundColor: colors.border },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: ui.error.color },
});
