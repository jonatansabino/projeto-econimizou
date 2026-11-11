import { createMockData } from './mock-data.ts';
import { validateFinanceData, type FinanceData } from '../domain/finance.ts';

export const FINANCE_STORAGE_KEY = '@econimizou/finance';
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
export type FinanceRepository = {
  load(): Promise<FinanceData | null>;
  save(data: FinanceData): Promise<void>;
};

// Contrato independente da plataforma, substituível por repositório de API no futuro.
export function createFinanceRepository(storage: KeyValueStorage, storageKey = FINANCE_STORAGE_KEY): FinanceRepository {
  return {
    async load() {
      const raw = await storage.getItem(storageKey);
      if (raw === null) return null;
      let data: unknown = JSON.parse(raw);
      // Migração local da etapa 2, preservando transações, perfil e metas existentes.
      if (typeof data === 'object' && data !== null && 'version' in data && data.version === 1) {
        const legacy = data as Record<string, unknown>;
        const defaults = createMockData();
        const preferences = typeof legacy.preferences === 'object' && legacy.preferences !== null ? legacy.preferences : {};
        data = { ...legacy, version: 2, onboarding: { completed: true }, preferences: { ...preferences, animationsEnabled: true }, chatMessages: defaults.chatMessages, recommendations: defaults.recommendations, notifications: defaults.notifications };
        validateFinanceData(data);
        await storage.setItem(storageKey, JSON.stringify(data));
      }
      validateFinanceData(data);
      // Dados salvos antes do tutorial pertencem a usuários existentes.
      if (data.onboarding === undefined) {
        data = { ...data, onboarding: { completed: true } };
        await storage.setItem(storageKey, JSON.stringify(data));
      }
      validateFinanceData(data);
      return data;
    },
    async save(data) {
      validateFinanceData(data);
      await storage.setItem(storageKey, JSON.stringify(data));
    },
  };
}
