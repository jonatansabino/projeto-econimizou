import { Platform } from 'react-native';

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const parsed = new URL(envUrl);
        parsed.hostname = window.location.hostname;
        return parsed.href.replace(/\/$/, '');
      } catch {
        return `http://${window.location.hostname}:8080`;
      }
    }
  }
  return envUrl;
}

export const apiUrl = resolveApiUrl();
export const allowLocalHttp = process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === 'true';
