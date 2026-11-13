import AsyncStorage from '@react-native-async-storage/async-storage';
import { FINANCE_STORAGE_KEY } from './finance-repository';
import type { PhotoRepository } from '../domain/profile-photo';

// Conservador: em dúvida ou se algum perfil não puder ser lido, mantém o arquivo.
export async function removeUnreferencedPhoto(repository: PhotoRepository, ref: string | null | undefined) {
  if (!ref) return;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(FINANCE_STORAGE_KEY));
    const rows = await AsyncStorage.multiGet(keys);
    for (const [, raw] of rows) {
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (!data || !data.profile || typeof data.profile !== 'object') return;
      if (data.profile.photoRef === ref) return;
    }
    await repository.remove(ref);
  } catch { /* Nunca excluir quando não for possível provar que não há referência. */ }
}
