import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { apiUrl, allowLocalHttp } from '@/constants/api';
import { createAuthApi } from '@/data/auth-api';
import { createTokenStorage } from '@/data/token-storage';
import { createAuthStore } from '@/state/auth-store';

const AuthContext = createContext<ReturnType<typeof createAuthStore> | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createAuthStore(createAuthApi({ url: apiUrl, web: Platform.OS === 'web', allowLocalHttp }), createTokenStorage(apiUrl), Platform.OS === 'web'));
  useEffect(() => { void store.restore(); }, [store]);
  useEffect(() => {
    const timer = setInterval(() => { void store.refresh(); }, 60000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void store.refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [store]);
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const store = useContext(AuthContext);
  if (!store) throw new Error('useAuth deve estar dentro de AuthProvider.');
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...store, ...snapshot };
}
