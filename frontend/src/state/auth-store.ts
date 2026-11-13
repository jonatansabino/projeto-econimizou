import { ApiError, validateAuthUser, type AuthApi, type AuthResult, type AuthSnapshot, type Credentials, type ProfileUpdate, type Registration, type TokenStorage } from '../domain/auth.ts';

export function createAuthStore(api: AuthApi, storage: TokenStorage, web: boolean) {
  let snapshot: AuthSnapshot = { status: 'restoring', user: null, error: null };
  const listeners = new Set<() => void>();
  let restoring: Promise<void> | null = null;
  let busy = false;
  let epoch = 0;
  let categorySession = 0;
  let expiresAt: number | null = null;
  const dismissedPersonalization = new Set<string>();
  const publish = (next: AuthSnapshot) => { snapshot = Object.freeze({ ...next, user: next.user ? Object.freeze({ id: next.user.id, name: next.user.name, email: next.user.email, avatar: next.user.avatar, ...(next.user.personalization ? { personalization: Object.freeze({ birth_date: next.user.personalization.birth_date, financial_objective: next.user.personalization.financial_objective, monthly_income_cents: next.user.personalization.monthly_income_cents, completed: next.user.personalization.completed || dismissedPersonalization.has(next.user.id) }) } : {}) }) : null }); listeners.forEach((fn) => fn()); };
  async function expired() {
    epoch++; categorySession++;
    api.setToken(null);
    try { await storage.clear(); } catch { /* Token já inválido: nenhuma leitura financeira é liberada. */ }
    publish({ status: 'signedOut', user: null, error: 'Sua sessão expirou. Entre novamente.' });
  }
  async function accept(result: AuthResult) {
    validateAuthUser(result.user);
    if (web) {
      try {
        result = await api.me();
        validateAuthUser(result.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) throw new ApiError('O navegador não permitiu iniciar a sessão. Verifique as configurações de cookies.');
        throw error;
      }
    } else {
      if (!result.access_token) throw new ApiError('Não foi possível iniciar a sessão. Tente novamente.');
      try { await storage.set(result.access_token); } catch {
        api.setToken(result.access_token);
        try { await api.logout(); } catch { /* O token não é publicado nem persistido; expira no servidor. */ }
        api.setToken(null);
        throw new ApiError('Não foi possível proteger a sessão neste aparelho. Tente novamente.');
      }
      api.setToken(result.access_token);
    }
    expiresAt = result.expires_at ? Date.parse(result.expires_at) : null;
    categorySession++;
    publish({ status: 'signedIn', user: result.user, error: null });
  }
  async function authenticate(action: () => Promise<AuthResult>) {
    if (busy) return;
    busy = true;
    epoch++;
    try { await accept(await action()); } finally { busy = false; }
  }
  return {
    getCategoryApi(userId: string) {
      const categoryApi = api.categoriesForUser?.(userId); if (!categoryApi) return undefined;
      const session = categorySession;
      const check = () => { if (categorySession !== session || snapshot.status !== 'signedIn' || snapshot.user?.id !== userId) throw new ApiError('A sessão mudou. Abra Categorias novamente.'); };
      const run = async <T>(action: () => Promise<T>) => {
        check();
        try { const result = await action(); check(); return result; }
        catch (error) { if (categorySession === session && snapshot.user?.id === userId && error instanceof ApiError && error.status === 401) await expired(); throw error; }
      };
      return {
        list: () => run(() => categoryApi.list()),
        create: (input: { name: string; type: 'income' | 'expense' }, key: string) => run(() => categoryApi.create(input, key)),
        update: (id: string, input: { name: string; type: 'income' | 'expense' }) => run(() => categoryApi.update(id, input)),
        remove: (id: string) => run(() => categoryApi.remove(id)),
      };
    },
    getFinancialApi(userId: string) {
      const bank=api.financesForUser?.(userId);if(!bank)return undefined;
      const session=categorySession;
      const run=async <T>(action:()=>Promise<T>)=>{
        if(session!==categorySession||snapshot.status!=='signedIn'||snapshot.user?.id!==userId)throw new ApiError('A sessão mudou. Recarregue.');
        try{const result=await action();if(session!==categorySession||snapshot.user?.id!==userId)throw new ApiError('A sessão mudou. Recarregue.');return result;}
        catch(error){if(session===categorySession&&snapshot.user?.id===userId&&error instanceof ApiError&&error.status===401)await expired();throw error;}
      };
      return {read:()=>run(()=>bank.read()),apply:(input:import('../domain/remote-finance.ts').BankWrite)=>run(()=>bank.apply(input))};
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    restore(): Promise<void> {
      if (restoring) return restoring;
      categorySession++;
      publish({ status: 'restoring', user: null, error: null });
      restoring = (async () => {
        try {
          if (!web) {
            const saved = await storage.get();
            if (!saved) { publish({ status: 'signedOut', user: null, error: null }); return; }
            api.setToken(saved);
          }
          const result = await api.me();
          validateAuthUser(result.user);
          expiresAt = result.expires_at ? Date.parse(result.expires_at) : null;
          publish({ status: 'signedIn', user: result.user, error: null });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            if (web) publish({ status: 'signedOut', user: null, error: null });
            else await expired();
          }
          else publish({ status: 'networkError', user: null, error: error instanceof Error ? error.message : 'Não foi possível validar sua sessão.' });
        } finally { restoring = null; }
      })();
      return restoring;
    },
    login: (credentials: Credentials) => authenticate(() => api.login(credentials)),
    register: (data: Registration) => authenticate(() => api.register(data)),
    dismissPersonalization() {
      if (snapshot.status !== 'signedIn' || !snapshot.user) return;
      dismissedPersonalization.add(snapshot.user.id);
      publish({ ...snapshot });
    },
    async refresh() {
      if (snapshot.status !== 'signedIn' || busy) return;
      const current = epoch;
      try {
        const result = await api.me();
        validateAuthUser(result.user);
        if (current !== epoch || snapshot.status !== 'signedIn') return;
        expiresAt = result.expires_at ? Date.parse(result.expires_at) : null;
        publish({ status: 'signedIn', user: result.user, error: null });
      } catch (error) {
        if (current !== epoch) return;
        if (error instanceof ApiError && error.status === 401) await expired();
        else if (expiresAt !== null && expiresAt <= Date.now()) publish({ status: 'networkError', user: null, error: 'Conecte-se à internet para validar seu acesso novamente.' });
      }
    },
    async logout() {
      if (busy) return;
      busy = true;
      epoch++;
      try {
        try { await api.logout(); } catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
        categorySession++;
        api.setToken(null);
        try { await storage.clear(); } finally { publish({ status: 'signedOut', user: null, error: null }); }
      } finally { busy = false; }
    },
    async updateProfile(profile: ProfileUpdate) {
      const current = epoch;
      try {
        const result = await api.profile(profile);
        validateAuthUser(result.user);
        if (current === epoch && snapshot.status === 'signedIn') publish({ status: 'signedIn', user: result.user, error: null });
      } catch (error) {
        if (current === epoch && error instanceof ApiError && error.status === 401) await expired();
        throw error;
      }
    },
  };
}
