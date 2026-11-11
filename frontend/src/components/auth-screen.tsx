import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardScroll } from '@/components/keyboard-scroll';
import { colors } from '@/constants/theme';

export function AuthScreen({ title, description, children }: ViewProps & { title: string; description: string }) {
  const insets = useSafeAreaInsets();
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
      <KeyboardScroll style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Ionicons name="leaf-outline" size={42} color={colors.primary} />
          <Text style={styles.brand}>ECONIMIZOU</Text>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {children}
        </View>
      </KeyboardScroll>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
  brand: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23, marginBottom: 8 },
});
