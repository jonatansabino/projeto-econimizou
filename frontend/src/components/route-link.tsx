import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';

export function RouteLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={styles.label}>{label}</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.primary} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12, minHeight: 56 },
  pressed: { opacity: 0.65, backgroundColor: colors.surface },
  label: { color: colors.text, fontSize: 15, fontWeight: '500', flexShrink: 1 },
});
