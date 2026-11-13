import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState, type Ref, type ComponentProps, type ComponentRef, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardScroll, useRevealField, type InputHandle } from '@/components/keyboard-scroll';
import { colors } from '@/constants/theme';
import { useFinance } from '@/state/finance-context';

export const ui = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 20, borderRadius: 24, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', flexShrink: 1 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  text: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  input: { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  error: { color: '#FDA4AF', fontSize: 14, lineHeight: 22 },
  success: { color: colors.primary, fontSize: 14, lineHeight: 22 },
  gap: { gap: 16 },
});

export type TouchHandle = ComponentRef<typeof Pressable>;
export function Button({ focusRef, label, onPress, icon, secondary = false, danger = false, disabled = false, loading = false }: {
  focusRef?: Ref<TouchHandle>; label: string; onPress: () => void; icon?: ComponentProps<typeof Ionicons>['name']; secondary?: boolean; danger?: boolean; disabled?: boolean; loading?: boolean;
}) {
  return (
    <Pressable ref={focusRef} accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, (disabled || loading || pressed) && { opacity: 0.55 }]}
      onPress={onPress}>
      {loading ? <ActivityIndicator color={secondary ? colors.primary : colors.background} /> : icon ? <Ionicons name={icon} size={20} color={secondary ? colors.primary : colors.background} /> : null}
      <Text style={[styles.buttonText, secondary && { color: colors.text }, danger && { color: '#FDA4AF' }]}>{label}</Text>
    </Pressable>
  );
}
export function IconButton({ label, icon, onPress, badge }: { label: string; icon: ComponentProps<typeof Ionicons>['name']; onPress: () => void; badge?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.5 }]}>
    <Ionicons name={icon} color={colors.primary} size={24} />
    {badge && <View style={styles.dot} />}
  </Pressable>;
}
export function PasswordToggle({ visible, onPress, confirmation = false }: { visible: boolean; onPress: () => void; confirmation?: boolean }) {
  const label = confirmation ? 'confirmação de senha' : 'senha';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Ocultar' : 'Mostrar'} ${label}`} onPress={onPress}
    style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: pressed ? colors.surface : 'transparent' })}>
    <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.primary} />
  </Pressable>;
}
export function Field({ label, error, trailingAccessory, ref: forwardedRef, ...props }: Omit<ComponentProps<typeof TextInput>, 'ref'> & { label: string; error?: string; trailingAccessory?: ReactNode; ref?: Ref<InputHandle> }) {
  const input = useRef<InputHandle | null>(null);
  const reveal = useRevealField();
  const attach = useCallback((node: InputHandle | null) => { input.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }, [forwardedRef]);
  return <View style={{ gap: 8, minWidth: 0 }}><Text style={ui.label}>{label}</Text><View><TextInput accessibilityLabel={label} aria-invalid={!!error} placeholderTextColor={colors.muted} selectionColor={colors.primary} {...props}
    ref={attach}
    onFocus={(event) => { reveal(input.current); props.onFocus?.(event); }} onBlur={(event) => { reveal(null); props.onBlur?.(event); }} style={[ui.input, error && { borderColor: '#FDA4AF' }, props.style, !!trailingAccessory && { paddingRight: 60 }]} />
    {trailingAccessory && <View style={{ position: 'absolute', right: 3, top: 0, bottom: 0, justifyContent: 'center' }}>{trailingAccessory}</View>}
    </View>
    {error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
  </View>;
}
export function Chips({ options, value, onChange, label, focusRef }: { focusRef?: Ref<TouchHandle>; options: { label: string; value: string; icon?: ComponentProps<typeof Ionicons>['name'] }[]; value: string; onChange: (value: string) => void; label: string }) {
  return <View style={{ gap: 8 }}><Text style={ui.label}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
    {options.map((option, index) => <Pressable ref={index === 0 ? focusRef : undefined} key={option.value} accessibilityRole="button" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: value === option.value }}
      onPress={() => onChange(option.value)} style={[styles.chip, value === option.value && styles.activeChip]}>
      {option.icon && <Ionicons name={option.icon} color={value === option.value ? colors.primary : colors.muted} size={18} />}
      <Text style={{ color: value === option.value ? colors.primary : colors.muted, fontSize: 13, fontWeight: '600' }}>{option.label}</Text>
    </Pressable>)}
  </ScrollView></View>;
}
export function Sheet({ title, onClose, children, footer }: PropsWithChildren<{ title: string; onClose: () => void; footer?: ReactNode }>) {
  const { data } = useFinance();
  const insets = useSafeAreaInsets();
  return <Modal transparent animationType={data.preferences.animationsEnabled ? 'fade' : 'none'} visible onRequestClose={onClose}>
    <SafeAreaView style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top} style={styles.sheetWrap}>
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={ui.between}><Text accessibilityRole="header" style={ui.title}>{title}</Text><IconButton label={`Fechar ${title}`} icon="close" onPress={onClose} /></View>
          <KeyboardScroll style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 18, paddingBottom: 32 }}>{children}</KeyboardScroll>
          {footer && <View style={{ gap: 12 }}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export function Empty({ text }: { text: string }) { return <View style={ui.card}><Text style={ui.text}>{text}</Text></View>; }
export function ErrorText({ error }: { error: string | null }) { return error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null; }
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Retorna boolean para fechar um formulário somente após gravação bem-sucedida.
  async function run(action: () => Promise<unknown>, message?: string) {
    setBusy(true); setError(null); setSuccess(null);
    try { await action(); if (message) setSuccess(message); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'); return false; }
    finally { setBusy(false); }
  }
  return { busy, error, success, run, setError };
}
export function ConfirmDelete({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => Promise<unknown> }) {
  const task = useTask();
  return <Sheet title="Confirmar exclusão" onClose={onCancel}>
    <Text style={ui.text}>Excluir “{title}”? Esta ação remove o item dos dados locais.</Text>
    <ErrorText error={task.error} />
    <Button label="Excluir definitivamente" danger secondary loading={task.busy} onPress={() => { void task.run(onConfirm).then((ok) => { if (ok) onCancel(); }); }} />
    <Button label="Cancelar exclusão" secondary disabled={task.busy} onPress={onCancel} />
  </Sheet>;
}
const styles = StyleSheet.create({
  button: { minHeight: 50, borderRadius: 15, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonText: { color: colors.background, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { borderColor: '#703741', backgroundColor: '#291D24' },
  iconButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  dot: { position: 'absolute', right: 9, top: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeChip: { backgroundColor: '#16392F', borderColor: '#287658' },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 16 },
  sheetWrap: { flex: 1, width: '100%', maxWidth: 640, justifyContent: 'center', alignSelf: 'center' },
  sheet: { backgroundColor: colors.background, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 18, flexShrink: 1, maxHeight: '100%' },
});
