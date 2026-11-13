import { memo, useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { resolveAvatar } from '@/domain/avatar';
import type { PhotoLease } from '@/domain/profile-photo';
import { usePhotoRepository } from '@/state/profile-photo-context';

export const ProfileAvatar = memo(function ProfileAvatar({ value, photoRef, photoUri, size = 52, label }: { value: string; photoRef?: string | null; photoUri?: string; size?: number; label: string }) {
  const repository = usePhotoRepository();
  const [image, setImage] = useState<{ key: string; uri: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let active = true; let lease: PhotoLease | null = null;
    if (photoRef && repository && !photoUri) {
      void repository.resolve(photoRef).then(result => {
        if (!active) { result?.release(); return; }
        lease = result; setImage(result ? { key: photoRef, uri: result.uri } : null);
      }).catch(() => { if (active) setImage(null); });
    }
    return () => { active = false; lease?.release(); };
  }, [photoRef, photoUri, repository]);
  const uri = photoUri || (image && image.key === photoRef ? image.uri : undefined);
  const avatar = resolveAvatar(value);
  const accessibility = Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false };
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri && failed !== uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: size, height: size }} onError={() => setFailed(uri)} {...accessibility} /> : <SvgXml xml={avatar.xml} width={size} height={size} {...accessibility} />}
  </View>;
});
const styles = StyleSheet.create({ frame: { backgroundColor: colors.surface, overflow: 'hidden', flexShrink: 0 } });
