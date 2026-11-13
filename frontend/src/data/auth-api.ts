import { validateBankSnapshot, type BankSnapshot } from '../domain/remote-finance.ts';
import { validateRemoteCategory, type RemoteCategory } from '../domain/categories.ts';
import { ApiError, type AuthApi, type AuthResult } from '../domain/auth.ts';

export function validateApiUrl(value: string, allowLocalHttp = false): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new ApiError('O serviço de acesso não está configurado.'); }
  const local = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(allowLocalHttp && local && url.protocol === 'http:'))) {
    throw new ApiError('O serviço deve utilizar uma conexão HTTPS.');
  }
  return url.href.replace(/\/$/, '');
}

export function createAuthApi({ url, web, allowLocalHttp = false, transport = fetch }: { url: string; web: boolean; allowLocalHttp?: boolean; transport?: typeof fetch }): AuthApi {
  let token: string | null = null;
  let csrf: string | null = null;
  let generation = 0;
  const resets = new Map<string,string>();
  const orders = new Map<string,number>();
  const applied = new Map<string,number>();
  async function request<T = AuthResult & { csrf_token?: string }>(path: string, method = 'GET', body?: unknown, expectedUser?: string): Promise<T> {
    const epoch = generation;
    const base = validateApiUrl(url, allowLocalHttp);
    if (web && method !== 'GET' && !csrf) {
      const result = await request('csrf');
      if (!result.csrf_token) throw new ApiError('Não foi possível validar a solicitação. Recarregue e tente novamente.');
      csrf = result.csrf_token;
    }
    if (expectedUser && epoch !== generation) throw new ApiError('A sessão mudou. Abra Categorias novamente.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await transport(`${base}${path.startsWith('/') ? path : `/api/auth/${path}`}`, {
        method, signal: controller.signal, credentials: web ? 'include' : 'omit',
        headers: { Accept: 'application/json', ...(expectedUser ? { 'X-Account-ID': expectedUser, ...(resets.has(expectedUser) ? { 'X-Finance-Reset': resets.get(expectedUser)! } : {}) } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(web ? { 'X-Auth-Client': 'web', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) } : token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      let data;
      try { data = await response.json(); } catch { throw new ApiError('O serviço está indisponível. Tente novamente.', response.status); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError('O serviço retornou uma resposta inválida. Tente novamente.', response.status);
      if (!response.ok) {
        if (data.code === 'csrf_invalid') csrf = null;
        throw new ApiError(typeof data.message === 'string' ? data.message : 'Não foi possível concluir. Tente novamente.', response.status, data.errors ?? {});
      }
      if (expectedUser && epoch !== generation) throw new ApiError('A sessão mudou. Abra Categorias novamente.');
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally { clearTimeout(timeout); }
  }
  const receive = async (userId: string, action: () => Promise<BankSnapshot>) => {
    const order=(orders.get(userId)??0)+1;orders.set(userId,order);
    const result=await action();validateBankSnapshot(result);
    if(order<(applied.get(userId)??0))throw new ApiError('Consulta substituída por dados mais recentes.');
    applied.set(userId,order);resets.set(userId,result.resetKey);return result;
  };
  return {
    financesForUser: userId => ({
      read: () => receive(userId, () => request<BankSnapshot>('/api/finance','GET',undefined,userId)),
      apply: input => receive(userId, () => request<BankSnapshot>('/api/finance/transactions','POST',input,userId)),
    }),
    categoriesForUser: userId => ({
      list: async () => { const result = await request<{ categories: RemoteCategory[] }>('/api/categories', 'GET', undefined, userId); if (!Array.isArray(result.categories)) throw new ApiError('Resposta de categorias inválida.'); result.categories.forEach(validateRemoteCategory); return result.categories; },
      create: async (input, clientKey) => { const result = await request<{ category: RemoteCategory }>('/api/categories', 'POST', { name: input.name, type: input.type, client_key: clientKey }, userId); validateRemoteCategory(result.category); return result.category; },
      update: async (id, input) => { const result = await request<{ category: RemoteCategory }>(`/api/categories/${encodeURIComponent(id)}`, 'PATCH', { name: input.name, type: input.type }, userId); validateRemoteCategory(result.category); return result.category; },
      remove: async id => { await request(`/api/categories/${encodeURIComponent(id)}`, 'DELETE', undefined, userId); },
    }),
    setToken: (value) => { generation++; token = value; },
    me: () => request('me'),
    login: (body) => { generation++; return request('login', 'POST', body); },
    register: (body) => { generation++; return request('register', 'POST', body); },
    logout: () => { generation++; return request('logout', 'POST', {}); },
    profile: (body) => request('profile', 'PATCH', body),
  };
}
