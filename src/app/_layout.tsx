import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { FinanceProvider, useFinance } from '@/state/finance-context';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <FinanceProvider>
        <AppNavigator />
      </FinanceProvider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { data } = useFinance();
  const needsOnboarding = data.onboarding?.completed === false;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!needsOnboarding} redirectTo="/onboarding">
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transacao" />
      <Stack.Screen name="relatorios" />
      <Stack.Screen name="categorias" />
      <Stack.Screen name="notificacoes" />
      <Stack.Screen name="privacidade" />
      <Stack.Screen name="+not-found" />
    </Stack.Protected>
    <Stack.Screen name="onboarding" options={{ gestureEnabled: !needsOnboarding }} />
  </Stack>;
}
