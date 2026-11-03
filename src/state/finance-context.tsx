import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { createFinanceRepository } from '@/data/finance-repository';
import { localDate, summarize } from '@/domain/finance';
import { createFinanceStore, type FinanceStore } from '@/state/finance-store';

const FinanceContext = createContext<{ store: FinanceStore; today: string } | null>(null);

export function FinanceProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createFinanceStore(createFinanceRepository(AsyncStorage)));
  const [today, setToday] = useState(() => localDate());
  const value = useMemo(() => ({ store, today }), [store, today]);
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { void store.initialize(); }, [store]);

  return (
    <FinanceContext.Provider value={value}>
      {snapshot.status === 'ready' ? children : (
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <Text style={styles.title}>Econimizou</Text>
            {snapshot.status === 'loading' ? (
              <><ActivityIndicator color={colors.primary} accessibilityLabel="Carregando dados" /><Text style={styles.message}>Preparando suas finanças…</Text></>
            ) : (
              <>
                <Text accessibilityRole="alert" style={styles.message}>{snapshot.error}</Text>
                <Pressable accessibilityRole="button" onPress={() => { void store.initialize(); }} style={styles.button}>
                  <Text style={styles.buttonText}>Tentar novamente</Text>
                </Pressable>
              </>
            )}
          </View>
        </SafeAreaView>
      )}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance deve estar dentro de FinanceProvider.');
  const { store, today } = context;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  if (snapshot.status !== 'ready') throw new Error('Os dados financeiros ainda não estão prontos.');
  return {
    ...store,
    today,
    data: snapshot.data,
    error: snapshot.error,
    summary: summarize(snapshot.data.transactions, today.slice(0, 7)),
    addTransaction: store.addTransaction,
    updateTransaction: store.updateTransaction,
    deleteTransaction: store.deleteTransaction,
    updatePreferences: store.updatePreferences,
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 20 },
  title: { color: colors.primary, fontSize: 28, fontWeight: '700' },
  message: { color: colors.muted, textAlign: 'center', lineHeight: 24 },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, minHeight: 48 },
  buttonText: { color: colors.background, fontWeight: '700' },
});
