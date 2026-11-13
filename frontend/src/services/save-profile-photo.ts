import type { FinanceData } from '../domain/finance.ts';
import type { PhotoRepository, StagedPhoto } from '../domain/profile-photo.ts';

export type LocalProfile = FinanceData['profile'];
// Publica somente dados já duráveis. Não envia referências de foto para a API.
export async function saveProfilePhoto({ previous, next, staged, repository, saveLocal, saveRemote, cleanupCreated, isCurrent = () => true }: {
  previous: LocalProfile; next: LocalProfile; staged?: StagedPhoto; repository: PhotoRepository;
  saveLocal(profile: LocalProfile): Promise<unknown>; saveRemote(avatar: string): Promise<unknown>; isCurrent?: () => boolean; cleanupCreated?: (ref: string) => Promise<unknown>;
}) {
  let created: string | null = null;
  let localSaved = false;
  try {
    if (!isCurrent()) throw new Error('A sessão mudou. Abra seu perfil novamente.');
    if (staged) created = await repository.commit(staged);
    if (!isCurrent()) throw new Error('A sessão mudou. Abra seu perfil novamente.');
    await saveLocal({ ...next, photoRef: created ?? next.photoRef ?? null });
    localSaved = true;
    if (!isCurrent()) throw new Error('A sessão mudou. Abra seu perfil novamente.');
    await saveRemote(next.avatar);
    return created ?? next.photoRef ?? null;
  } catch (error) {
    if (localSaved) {
      try { await saveLocal({ ...previous, photoRef: previous.photoRef ?? null }); }
      catch { throw new Error('Não foi possível concluir nem restaurar o perfil local. As imagens foram preservadas; confira o perfil e tente novamente.'); }
    }
    if (created) { try { await (cleanupCreated ? cleanupCreated(created) : repository.remove(created)); } catch { /* Falha de limpeza nunca remove a foto anterior. */ } }
    throw error;
  }
}
