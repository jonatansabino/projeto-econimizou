import { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { resolveAvatar } from '@/domain/avatar';

export const ProfileAvatar = memo(function ProfileAvatar({ value, size = 52, label }: { value: string; size?: number; label: string }) {
  const avatar = resolveAvatar(value);
  // O wrapper fornece o nome acessível. SVG web usa ARIA; accessible é nativo.
  const accessibility = Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false };
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.frame, { width: size, height: size, borderRadius: size * 0.3 }]}>
    <SvgXml xml={avatar.xml} width={size} height={size} {...accessibility} />
  </View>;
});
const styles = StyleSheet.create({
  frame: { backgroundColor: colors.surface, overflow: 'hidden', flexShrink: 0 },
});
