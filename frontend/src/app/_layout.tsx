import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { Button, ErrorText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/state/auth-context';
import { FinanceProvider, useFinance } from '@/state/finance-context';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <AuthProvider><SessionGate /></AuthProvider>
    </ThemeProvider>
  );
}

function SessionGate() {
  const auth = useAuth();
  if (auth.status === 'restoring' || auth.status === 'networkError') return <AuthScreen title="Econimizou" description={auth.status === 'restoring' ? 'Validando seu acesso…' : 'Vamos reconectar sua conta.'}>
    {auth.status === 'restoring' ? <ActivityIndicator color={colors.primary} accessibilityLabel="Restaurando sessão" /> : <><ErrorText error={auth.error} /><Button label="Tentar conectar novamente" onPress={() => { void auth.restore(); }} /></>}
  </AuthScreen>;
  return auth.user ? <FinanceProvider key={auth.user.id} identity={auth.user}><AppNavigator /></FinanceProvider> : <RootNavigator signedIn={false} needsOnboarding={false} />;
}

function AppNavigator() {
  const { data } = useFinance();
  const needsOnboarding = data.onboarding?.completed === false;
  return <RootNavigator signedIn needsOnboarding={needsOnboarding} />;
}

function RootNavigator({ signedIn, needsOnboarding }: { signedIn: boolean; needsOnboarding: boolean }) {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!signedIn} redirectTo="/">
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack.Protected>
    <Stack.Protected guard={signedIn && !needsOnboarding} redirectTo={signedIn ? '/onboarding' : '/login'}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transacao" />
      <Stack.Screen name="relatorios" />
      <Stack.Screen name="categorias" />
      <Stack.Screen name="notificacoes" />
      <Stack.Screen name="privacidade" />
      <Stack.Screen name="+not-found" />
    </Stack.Protected>
    <Stack.Protected guard={signedIn} redirectTo="/login"><Stack.Screen name="onboarding" options={{ gestureEnabled: !needsOnboarding }} /></Stack.Protected>
  </Stack>;
}
