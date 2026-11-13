import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { ui } from '@/components/ui';

export function SettingsSection({
  title,
  children,
  description,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={ui.card}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={ui.title}>{title}</Text>
        {description ? <Text style={ui.text}>{description}</Text> : null}
      </View>
      <View style={{ gap: 14 }}>
        {children}
      </View>
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  description,
  onPress,
  right,
  badge,
  danger = false,
  disabled = false,
  accessibilityLabel,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  onPress?: () => void;
  right?: ReactNode;
  badge?: string | number;
  danger?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, danger && styles.dangerIconWrap]}>
        <Ionicons name={icon} size={20} color={danger ? '#FDA4AF' : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[ui.label, danger && { color: '#FDA4AF' }]}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward-outline" size={18} color={colors.muted} /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed || disabled ? 0.6 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#16392F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#235D48',
  },
  dangerIconWrap: {
    backgroundColor: '#381E24',
    borderColor: '#602832',
  },
  desc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
  },
});
