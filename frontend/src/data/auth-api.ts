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
  async function request(path: string, method = 'GET', body?: unknown): Promise<AuthResult & { csrf_token?: string }> {
    const base = validateApiUrl(url, allowLocalHttp);
    if (web && method !== 'GET' && !csrf) {
      const result = await request('csrf');
      if (!result.csrf_token) throw new ApiError('Não foi possível validar a solicitação. Recarregue e tente novamente.');
      csrf = result.csrf_token;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await transport(`${base}/api/auth/${path}`, {
        method, signal: controller.signal, credentials: web ? 'include' : 'omit',
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally { clearTimeout(timeout); }
  }
  return {
    setToken: (value) => { token = value; },
    me: () => request('me'),
    login: (body) => request('login', 'POST', body),
    register: (body) => request('register', 'POST', body),
    logout: () => request('logout', 'POST', {}),
    profile: (body) => request('profile', 'PATCH', body),
  };
}
