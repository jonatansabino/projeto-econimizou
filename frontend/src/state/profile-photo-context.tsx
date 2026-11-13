import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { createPhotoRepository } from '@/data/photo-storage';
import type { PhotoRepository } from '@/domain/profile-photo';

const PhotoContext = createContext<{ repository: PhotoRepository; notify(message: string): void } | null>(null);
export function ProfilePhotoProvider({ scope, children }: PropsWithChildren<{ scope: string }>) {
  const repository = useMemo(() => createPhotoRepository(scope), [scope]);
  const [notice, setNotice] = useState<{ message: string } | null>(null);
  const insets = useSafeAreaInsets();
  const notify = useCallback((message: string) => setNotice({ message }), []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 3500); return () => clearTimeout(timer); }, [notice]);
  const context = useMemo(() => ({ repository, notify }), [repository, notify]);
  return <PhotoContext.Provider value={context}>{children}{notice && <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface }}><Text accessibilityLiveRegion="polite" style={{ color: colors.primary, textAlign: 'center' }}>{notice.message}</Text></View>}</PhotoContext.Provider>;
}
export function usePhotoRepository() { return useContext(PhotoContext)?.repository ?? null; }

export function usePhotoFeedback() { const context = useContext(PhotoContext); return context?.notify ?? (() => {}); }
