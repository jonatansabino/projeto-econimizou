import type { TokenStorage } from '../domain/auth';

// A sessão web é um cookie HttpOnly da API. Nenhum token chega a este storage.
export function createTokenStorage(_scope: string): TokenStorage {
  return { get: async () => null, set: async () => { throw new Error('Tokens web não podem ser persistidos por JavaScript.'); }, clear: async () => {} };
}
