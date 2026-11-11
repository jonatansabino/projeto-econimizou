import * as SecureStore from 'expo-secure-store';
import type { TokenStorage } from '../domain/auth';

export function createTokenStorage(scope: string): TokenStorage {
  // Codificação sem colisões, usando somente os caracteres aceitos pelo SecureStore.
  const encoded = scope.trim().replace(/\/$/, '').split('').map((character) => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  const key = `econimizou.auth.${encoded}`;
  return {
    get: () => SecureStore.getItemAsync(key),
    set: (token) => SecureStore.setItemAsync(key, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    clear: () => SecureStore.deleteItemAsync(key),
  };
}
