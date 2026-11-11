import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

const icons: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  index: 'home-outline',
  extrato: 'receipt-outline',
  chat: 'chatbubble-ellipses-outline',
  metas: 'flag-outline',
  configuracoes: 'settings-outline',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { height: 66 + insets.bottom, paddingBottom: Math.max(8, insets.bottom), paddingTop: 6, backgroundColor: colors.background, borderTopColor: colors.border },
      tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: { paddingVertical: 0 },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse-outline'} color={typeof color === 'string' ? color : colors.muted} size={size} />,
      sceneStyle: { backgroundColor: colors.background },
    })}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarAccessibilityLabel: 'Início' }} />
      <Tabs.Screen name="extrato" options={{ title: 'Extrato', tabBarAccessibilityLabel: 'Extrato' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat IA', tabBarAccessibilityLabel: 'Chat IA' }} />
      <Tabs.Screen name="metas" options={{ title: 'Metas', tabBarAccessibilityLabel: 'Metas' }} />
      <Tabs.Screen name="configuracoes" options={{ title: 'Ajustes', tabBarAccessibilityLabel: 'Ajustes' }} />
    </Tabs>
  );
}
