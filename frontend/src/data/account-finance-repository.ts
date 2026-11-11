import { createMockData } from './mock-data.ts';
import { createFinanceRepository, FINANCE_STORAGE_KEY, type KeyValueStorage, type FinanceRepository } from './finance-repository.ts';
import { validateFinanceData } from '../domain/finance.ts';
import type { AuthUser } from '../domain/auth.ts';

export function accountStorageKey(api: string, id: string) {
  return `${FINANCE_STORAGE_KEY}:account:${encodeURIComponent(api.replace(/\/$/, ''))}:${encodeURIComponent(id)}`;
}
export function createAccountFinanceRepository(storage: KeyValueStorage, api: string, user: AuthUser): FinanceRepository {
  const repository = createFinanceRepository(storage, accountStorageKey(api, user.id));
  return {
    async load() {
      const saved = await repository.load();
      if (saved) return saved;
      const fresh = createMockData();
      fresh.profile = { name: user.name, avatar: user.avatar };
      fresh.transactions = [];
      fresh.goals = [];
      fresh.notifications = fresh.notifications.map((item) => ({ ...item, body: 'Sua conta está pronta. Registre suas receitas, despesas e metas. As finanças ficam neste aparelho, separadas por conta.' }));
      // Reaproveita somente a conclusão do tutorial; os dados antigos continuam sem dono.
      const legacy = await storage.getItem(FINANCE_STORAGE_KEY);
      if (legacy) {
        try {
          const previous = JSON.parse(legacy);
          validateFinanceData(previous);
          if (previous.onboarding?.completed !== false) fresh.onboarding = { completed: true };
        } catch { /* Arquivo antigo inválido também é preservado para recuperação futura. */ }
      }
      await repository.save(fresh);
      return fresh;
    },
    save: repository.save,
  };
}
