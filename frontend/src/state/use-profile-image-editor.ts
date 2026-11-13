import { useCallback, useEffect, useRef, useState } from 'react';

import { removeUnreferencedPhoto } from '@/data/photo-cleanup';
import { resolveAvatar } from '@/domain/avatar';
import type { FinanceData } from '@/domain/finance';
import { PhotoError, type PhotoRepository, type StagedPhoto } from '@/domain/profile-photo';
import { saveProfilePhoto } from '@/services/save-profile-photo';
import { usePhotoFeedback, usePhotoRepository } from '@/state/profile-photo-context';

type Mode = 'idle' | 'options' | 'avatars' | 'picking' | 'preview' | 'remove';
type Draft = { avatar: string; photoRef: string | null; staged?: StagedPhoto };
export function useProfileImageEditor(profile: FinanceData['profile']) {
  const availableRepository = usePhotoRepository();
  if (!availableRepository) throw new Error('Editor de imagem fora do perfil autenticado.');
  const repository: PhotoRepository = availableRepository;
  const feedback = usePhotoFeedback();
  const [draft, setDraft] = useState<Draft>(() => ({ avatar: resolveAvatar(profile.avatar).id, photoRef: profile.photoRef ?? null }));
  const [mode, setMode] = useState<Mode>('idle');
  const [galleryAvatar, setGalleryAvatar] = useState(draft.avatar);
  const [candidate, setCandidate] = useState<StagedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const assets = useRef(new Map<string, StagedPhoto>());
  const mounted = useRef(true);
  const generation = useRef(0);
  const selecting = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => { generation.current++; abort.current?.abort(); }, []);
  const discard = async (photo: StagedPhoto) => { assets.current.delete(photo.id); try { await repository.discard(photo); } catch { /* Mantém o arquivo se não for possível limpar com segurança. */ } };
  useEffect(() => {
    mounted.current = true;
    const ownedAssets = assets.current;
    void repository.recover().then(photo => {
      if (!photo) return;
      if (!mounted.current) { void repository.discard(photo); return; }
      ownedAssets.set(photo.id, photo); setCandidate(photo); setMode('preview');
    }).catch(() => { if (mounted.current) setError('Não foi possível recuperar a seleção anterior. Escolha outra foto.'); });
    return () => {
      mounted.current = false; invalidate();
      for (const photo of ownedAssets.values()) void repository.discard(photo).catch(() => {});
      ownedAssets.clear();
    };
  }, [repository, invalidate]);
  async function pick() {
    if (selecting.current) return;
    selecting.current = true; const current = ++generation.current;
    const controller = new AbortController(); abort.current = controller;
    setError(null); setPermissionError(false); setMode('picking');
    try {
      const photo = await repository.pick(controller.signal);
      if (!mounted.current || current !== generation.current) { if (photo) await repository.discard(photo); return; }
      if (!photo) { setMode('options'); return; }
      assets.current.set(photo.id, photo); setCandidate(photo); setMode('preview');
    } catch (cause) {
      if (mounted.current && current === generation.current) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível selecionar a foto.');
        setPermissionError(cause instanceof PhotoError && cause.code === 'permission'); setMode('options');
      }
    } finally { if (current === generation.current) selecting.current = false; }
  }
  function cancelStep() {
    setError(null);
    if (mode === 'picking') { generation.current++; abort.current?.abort(); selecting.current = false; setMode('options'); }
    else if (mode === 'preview') { if (candidate) void discard(candidate); setCandidate(null); setMode('options'); }
    else setMode(mode === 'options' ? 'idle' : 'options');
  }
  async function save(name: string, saveLocal: (profile: FinanceData['profile']) => Promise<unknown>, saveRemote: (avatar: string) => Promise<unknown>) {
    const next = { name, avatar: draft.avatar, photoRef: draft.photoRef };
    const result = await saveProfilePhoto({ previous: profile, next, staged: draft.staged, repository, saveLocal, saveRemote, cleanupCreated: ref => removeUnreferencedPhoto(repository, ref), isCurrent: () => mounted.current });
    for (const photo of Array.from(assets.current.values())) await discard(photo);
    if (profile.photoRef && profile.photoRef !== result) void removeUnreferencedPhoto(repository, profile.photoRef);
    feedback('Perfil salvo.');
  }
  return {
    mode, draft, galleryAvatar, candidate, error, permissionError,
    open() { if (mode === 'idle') { setError(null); setMode('options'); } },
    chooseAvatar() { setGalleryAvatar(draft.avatar); setError(null); setMode('avatars'); },
    setGalleryAvatar,
    useAvatar() { setDraft({ avatar: galleryAvatar, photoRef: null }); setMode('idle'); },
    pick,
    usePhoto() { if (candidate) { setDraft(previous => ({ ...previous, staged: candidate, photoRef: null })); setCandidate(null); setMode('idle'); } },
    requestRemoval() { setMode('remove'); },
    removePhoto() { setDraft(previous => ({ avatar: previous.avatar, photoRef: null })); setMode('idle'); },
    cancelStep,
    hasPhoto: !!draft.staged || !!draft.photoRef,
    save,
  };
}
export type ProfileImageEditor = ReturnType<typeof useProfileImageEditor>;
