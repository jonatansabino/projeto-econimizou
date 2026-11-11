import { router, useIsFocused } from 'expo-router';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardScroll } from '@/components/keyboard-scroll';
import { IconButton } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useFinance } from '@/state/finance-context';

type ScreenProps = PropsWithChildren<{ title: string; description: string; back?: boolean; bottomSafe?: boolean; onBack?: () => void }>;
export function Screen({ title, description, back = false, bottomSafe = false, onBack, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { data } = useFinance();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active && !reduced && data.preferences.animationsEnabled) {
        opacity.setValue(0);
        animation = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' });
        animation.start();
      }
    }).catch(() => {});
    return () => { active = false; animation?.stop(); opacity.setValue(1); };
  }, [opacity, data.preferences.animationsEnabled]);
  return (
    <SafeAreaView aria-hidden={Platform.OS === 'web' ? !focused : undefined} style={styles.safe} edges={['top', 'left', 'right', ...(back || bottomSafe ? ['bottom' as const] : [])]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <KeyboardScroll style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
          <Animated.View style={[styles.content, { opacity }]}>
            {back && <IconButton label="Voltar" icon="arrow-back" onPress={onBack ?? (() => { if (router.canGoBack()) router.back(); else router.replace('/'); })} />}
            <Text style={styles.brand}>ECONIMIZOU</Text>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            {children}
          </Animated.View>
        </KeyboardScroll>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
  brand: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 8 },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 8 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23, marginBottom: 4 },
});
