import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useFinance } from '@/state/finance-context';

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const { data } = useFinance();
  const percent = Math.max(0, Math.min(100, value));
  const [width] = useState(() => new Animated.Value(percent));
  useEffect(() => {
    const animation = Animated.timing(width, { toValue: percent, duration: data.preferences.animationsEnabled ? 400 : 0, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [percent, width, data.preferences.animationsEnabled]);
  return <View aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }} style={styles.track}>
    <Animated.View style={[styles.fill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
  </View>;
}
const styles = StyleSheet.create({
  track: { height: 9, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.primary },
});
