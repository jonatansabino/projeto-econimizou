import { ApiError } from './auth.ts';
import { normalize } from './features.ts';
import type { Category, FinanceData } from './finance.ts';

export type RemoteCategory = { id: string; name: string; type: 'income' | 'expense'; client_key: string | null; archived: boolean };
export interface CategoryApi {
  list(): Promise<RemoteCategory[]>;
  create(input: Pick<Category, 'name' | 'type'>, clientKey: string): Promise<RemoteCategory>;
  update(id: string, input: Pick<Category, 'name' | 'type'>): Promise<RemoteCategory>;
  remove(id: string): Promise<void>;
}
export function validateRemoteCategory(value: unknown): asserts value is RemoteCategory {
  const c = value as RemoteCategory;
  if (!c || typeof c.id !== 'string' || !/^\d+$/.test(c.id) || typeof c.name !== 'string' || !c.name.trim() || !['income','expense'].includes(c.type) || typeof c.archived !== 'boolean' || !(c.client_key === null || typeof c.client_key === 'string')) throw new ApiError('A API retornou uma categoria inválida.');
}
export function categoryInUse(data: FinanceData, id: string) {
  return data.transactions.some(t => t.categoryId === id) || (data.commitments ?? []).some(b => b.categoryId === id) || (data.commitmentRecurrences ?? []).some(r => r.categoryId === id) || data.chatMessages.some(m => m.status === 'pending' && m.proposal?.categoryId === id);
}
export function mergeCategories(local: Category[], remote: RemoteCategory[], complete = false): Category[] {
  remote.forEach(validateRemoteCategory);
  if (new Set(remote.map(r => r.id)).size !== remote.length) throw new ApiError('A API retornou categorias duplicadas.');
  const remoteIds = new Set(remote.map(c => c.id));
  const result = local.map(category => ({ ...category, ...(complete && category.remoteId && !remoteIds.has(category.remoteId) ? { archived: true } : {}) }));
  for (const item of remote) {
    let index = result.findIndex(c => c.remoteId === item.id);
    if (index < 0) index = result.findIndex(c => !c.remoteId && (c.id === item.client_key || (c.type === item.type && normalize(c.name) === normalize(item.name))));
    const category: Category = { id: index >= 0 ? result[index].id : `api-category:${item.id}`, remoteId: item.id, name: item.name, type: item.type, archived: item.archived };
    if (index >= 0) {
      // Tipo remoto nunca deve quebrar referências de transações locais existentes.
      if (result[index].type !== item.type) throw new ApiError('Categoria com tipo incompatível. Seus dados locais foram preservados.');
      result[index] = category;
    } else result.push(category);
  }
  return result;
}
